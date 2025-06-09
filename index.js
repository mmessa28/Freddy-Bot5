const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const client = new Client({
    authStrategy: new LocalAuth()
});

let warnedUsers = {};

const badWords = ['idiot', 'hurensohn', 'fuck', 'bastard'];
const groupLinkRegex = /chat\\.whatsapp\\.com\\/[A-Za-z0-9]+/;

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Freddy ist aktiv!');
});

client.on('message_create', async msg => {
    if (!msg.fromMe && msg.type === 'chat') {
        const chat = await msg.getChat();
        if (!chat.isGroup) return;

        const user = msg.author || msg.from;
        const content = msg.body.toLowerCase();

        // Fremde WhatsApp-Gruppenlinks
        if (groupLinkRegex.test(content)) {
            await chat.removeParticipants([user]);
            await chat.sendMessage(`🚫 @${user.split('@')[0]} wurde wegen Fremdwerbung entfernt.`, { mentions: [await msg.getContact()] });
            return;
        }

        // Doppelte Nachricht
        const messages = await chat.fetchMessages({ limit: 5 });
        const same = messages.filter(m => m.body === msg.body && m.from === msg.from);
        if (same.length > 1) {
            if (!warnedUsers[user]) {
                warnedUsers[user] = true;
                await chat.sendMessage(`⚠️ @${user.split('@')[0]}, bitte keine doppelten Nachrichten.`, { mentions: [await msg.getContact()] });
            } else {
                await chat.removeParticipants([user]);
                await chat.sendMessage(`🚫 @${user.split('@')[0]} wurde wegen Spam entfernt.`, { mentions: [await msg.getContact()] });
            }
            return;
        }

        // Beleidigungen
        if (badWords.some(w => content.includes(w))) {
            if (!warnedUsers[user]) {
                warnedUsers[user] = true;
                await chat.sendMessage(`⚠️ @${user.split('@')[0]}, bitte keine Beleidigungen.`, { mentions: [await msg.getContact()] });
            } else {
                await chat.removeParticipants([user]);
                await chat.sendMessage(`🚫 @${user.split('@')[0]} wurde wegen Beleidigungen entfernt.`, { mentions: [await msg.getContact()] });
            }
        }
    }
});

client.initialize();