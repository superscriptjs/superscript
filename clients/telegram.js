import TelegramBot from 'node-telegram-bot-api';
import SuperScript from 'superscript';

const options = {
  factSystem: {
    clean: true,
  },
  importFile: './data.json',
};

SuperScript(options, (err, bot) => {
  if (err) {
    console.error(err);
  }
  // Auth Token - You can generate your token from @BotFather
  // @BotFather is the one bot to rule them all.
  const token = '...';

  //= == Polling ===
  const telegram = new TelegramBot(token, {
    polling: true,
  });

  //= == Webhook ===
  // Choose a port
  // var port = 8080;

  // var telegram = new TelegramBot(token, {
  //    webHook: {
  //        port: port,
  //        host: 'localhost'
  //    }
  // });

  // Use `ngrok http 8080` to tunnels localhost to a https endpoint. Get it at https://ngrok.com/
  // telegram.setWebHook('https://_____.ngrok.io/' + token);

  telegram.on('message', (msg) => {
    const fromId = msg.from.id;
    const text = msg.text.trim();

    bot.reply(fromId, text, (err, reply) => {
      if (reply.string) {
        telegram.sendMessage(fromId, reply.string);
        // From file
        // var photo = __dirname+'/../test/bot.gif';
        // telegram.sendPhoto(fromId, photo, {caption: "I'm a bot!"});

        // For more examples, check out https://github.com/yagop/node-telegram-bot-api
      }
    });
  });
});
