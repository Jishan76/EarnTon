const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const express = require('express');

// Replace with your Telegram bot token and MongoDB URI
const token = '7255365749:AAFL9d_6_U1XH9s7oD87A0qJ0Uu_qnx9Ios';
const mongoUri = 'mongodb+srv://aminulzisan76:aminulzisan@cluster0.cxo0nw4.mongodb.net/tgbot2';
const requiredChannel = '@earntonrewards';

const bot = new TelegramBot(token, { polling: true });

// Connect to MongoDB
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    inviterId: String,
    balance: { type: Number, default: 0.1 }
});

const User = mongoose.model('User', userSchema);

const userStates = {};






const bodyParser = require('body-parser');

// Replace with your Telegram bot token and your domain
const token = '7255365749:AAFL9d_6_U1XH9s7oD87A0qJ0Uu_qnx9Ios';
const webhookUrl = 'https://earnton.onrender.com/yourwebhookpath';

// Create a new TelegramBot instance
const bot = new TelegramBot(token);



app.use(bodyParser.json());

app.post('/yourwebhookpath', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Start server

// Set the webhook
bot.setWebHook(webhookUrl);

// Function to check if user is a member of the required channel
const isUserMemberOfChannel = async (userId) => {
    try {
        const member = await bot.getChatMember(requiredChannel, userId);
        return member.status === 'member' || member.status === 'administrator' || member.status === 'creator';
    } catch (error) {
        console.error('Error checking channel membership:', error);
        return false;
    }
};

// Start command handler
bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const inviterId = match[1];

    try {
        const isMember = await isUserMemberOfChannel(chatId);

        if (!isMember) {
            bot.sendMessage(chatId, `Please join our channel first: ${requiredChannel}`);
            return;
        }

        let user = await User.findOne({ userId: chatId });

        if (!user) {
            user = new User({ userId: chatId, inviterId });
            await user.save();

            const inviter = await User.findOne({ userId: inviterId });
            if (inviter) {
                inviter.balance += 0.06;
                await inviter.save();
            }

            bot.sendMessage(chatId, `Welcome! Your balance is 0.1. Inviter ID: ${inviterId}`);
        } else {
            bot.sendMessage(chatId, `You have already started the bot. Your balance is ${user.balance}`);
        }

        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Join Channel', url: `https://t.me/${requiredChannel.substring(1)}` },
                        { text: 'Your Invite URL', callback_data: 'invite_url' }
                    ],
                    [
                        { text: 'Balance', callback_data: 'balance' },
                        { text: 'Withdraw', callback_data: 'withdraw' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, 'Choose an option:', opts);
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'An error occurred. Please try again later.');
    }
});

bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const data = callbackQuery.data;

    try {
        const user = await User.findOne({ userId: chatId });

        if (!user) {
            bot.sendMessage(chatId, 'You have not started the bot. Please use /start <inviter_id> to begin.');
            return;
        }

        if (data === 'invite_url') {
            const inviteUrl = `https://t.me/earntonbot?start=${chatId}`;
            bot.sendMessage(chatId, `Your invite URL: ${inviteUrl}`);
        } else if (data === 'balance') {
            bot.sendMessage(chatId, `Your balance is ${user.balance}`);
        } else if (data === 'withdraw') {
            userStates[chatId] = { step: 'wallet_address' };
            bot.sendMessage(chatId, 'Please enter your wallet address:');
        }
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'An error occurred. Please try again later.');
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (userStates[chatId] && userStates[chatId].step === 'wallet_address') {
        userStates[chatId].walletAddress = msg.text;
        userStates[chatId].step = 'amount';
        bot.sendMessage(chatId, 'Please enter the amount to withdraw:');
    } else if (userStates[chatId] && userStates[chatId].step === 'amount') {
        const amount = parseFloat(msg.text);

        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Invalid amount. Please enter a valid number:');
            return;
        }

        userStates[chatId].amount = amount;

        const user = await User.findOne({ userId: chatId });

        if (user.balance < amount) {
            bot.sendMessage(chatId, 'Insufficient balance. Please enter a valid amount:');
            return;
        }

        user.balance -= amount;
        await user.save();

        bot.sendMessage(chatId, `Withdrawal of ${amount} to wallet ${userStates[chatId].walletAddress} has been processed. Payment will be received under 72 hours`);

        // Here, you would typically send the withdrawal request to your payment processing system

        delete userStates[chatId];
    }
});

// Set up an Express server
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('Telegram bot is running...');
});

app.listen(port, () => {
    console.log(`Express server listening at http://localhost:${port}`);
});
