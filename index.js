const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

// Replace with your Telegram bot token
const token = 'YOUR_TELEGRAM_BOT_TOKEN';
const bot = new TelegramBot(token, {polling: true});

// Connect to MongoDB
mongoose.connect('mongodb+srv://aminulzisan76:aminulzisan@cluster0.cxo0nw4.mongodb.net/tgbot2', { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    inviterId: String,
    balance: { type: Number, default: 0.1 }
});

const User = mongoose.model('User', userSchema);

const userStates = {};

bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const inviterId = match[1];

    try {
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
                        { text: 'Join Channel', url: 'https://t.me/your_channel' },
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
            const inviteUrl = `https://t.me/your_bot_username?start=${chatId}`;
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

        bot.sendMessage(chatId, `Withdrawal of ${amount} to wallet ${userStates[chatId].walletAddress} has been processed.`);

        // Here, you would typically send the withdrawal request to your payment processing system

        delete userStates[chatId];
    }
});

console.log('Bot is running...');
