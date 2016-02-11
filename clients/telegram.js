var TelegramBot = require('node-telegram-bot-api');
var superscript = require("superscript");
var mongoose = require("mongoose");
var facts = require("sfacts");
var factSystem = facts.create('telegramFacts');

mongoose.connect('mongodb://localhost/superscriptDB');

var TopicSystem = require("superscript/lib/topics/index")(mongoose, factSystem);
// TopicSystem.importerFile('./data.json', function(){  })

var options = {};
options['factSystem'] = factSystem;
options['mongoose'] = mongoose;

new superscript(options, function(err, bot) {
    // Auth Token - You can generate your token from @BotFather
    // @BotFather is the one bot to rule them all. 
    var token = '...';
    
    //=== Polling ===
    var telegram = new TelegramBot(token, {
      polling: true
    }
    
    
    //=== Webhook ===
    //Choose a port
    //var port = 8080;
    
    //var telegram = new TelegramBot(token, {
    //    webHook: {
    //        port: port,
    //        host: 'localhost'
    //    }
    //});
  
    //Use `ngrok http 8080` to tunnels localhost to a https endpoint. Get it at https://ngrok.com/
    //telegram.setWebHook('https://_____.ngrok.io/' + token);

    telegram.on('message', function(msg) {
        var fromId = msg.from.id;
        var text = msg.text.trim();

        bot.reply(fromId, text, function(err, reply) {
            if (reply.string) {
                telegram.sendMessage(fromId, reply.string);
                
                  // From file
                  //var photo = __dirname+'/../test/bot.gif';
                  //telegram.sendPhoto(fromId, photo, {caption: "I'm a bot!"});
                  
                  //For more examples, check out https://github.com/yagop/node-telegram-bot-api
            }
        });
    });
});
