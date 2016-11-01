import SuperScript from 'superscript';
import xmpp from 'simple-xmpp';

const receiveData = function receiveData(from, bot, data) {
  // Handle incoming messages.
  let message = `${data}`;

  message = message.replace(/[\x0D\x0A]/g, '');

  bot.reply(from, message.trim(), (err, reply) => {
    xmpp.send(from, reply.string);
  });
};

// You need authorize this authentication method in Google account.
const botHandle = function botHandle(err, bot) {
  xmpp.connect({
    jid: 'EMAIL ADRESS',
    password: 'PASSWORD',
    host: 'talk.google.com',
    port: 5222,
    reconnect: true,
  });

  xmpp.on('online', (data) => {
    console.log(`Connected with JID: ${data.jid.user}`);
    console.log('Yes, I\'m connected!');
  });

  xmpp.on('chat', (from, message) => {
    receiveData(from, bot, message);
  });

  xmpp.on('error', (err) => {
    console.error(err);
  });
};

// Main entry point
const options = {
  factSystem: {
    clean: true,
  },
  importFile: './data.json',
};

SuperScript(options, (err, bot) => {
  botHandle(null, bot);
});
