
// Auth Token - You can generate your token from 
// https://<slack_name>.slack.com/services/new/bot
var token = "...";

// This is the main Bot interface
var superscript = require("superscript");

// slack-client provides auth and sugar around dealing with the RealTime API.
var Slack = require("slack-client");

var debug = require('debug')("Slack Client");
var facts = require("sfacts");
var factSystem = facts.explore("botfacts");


// How should we reply to the user? 
// direct - sents a DM
// atReply - sents a channel message with @username
// public sends a channel reply with no username
var replyType = "atReply"; 

var atReplyRE = /<@(.*?)>/;
var options = {};
options.factSystem = factSystem;

var slack = new Slack(token, true, true);

var botHandle = function(err, bot) {
  slack.login()

  slack.on('error', function(error) {
    console.error("Error:");
    console.log(error)
  })

  slack.on('open', function(){
    console.log("Welcome to Slack. You are %s of %s", slack.self.name, slack.team.name);
  })

  slack.on('close', function() {
    console.warn("Disconnected");
  })

  slack.on('message', function(data) {
    receiveData(slack, bot, data);
  });
}

var receiveData = function(slack, bot, data) {

  // Fetch the user who sent the message;
  var user = data._client.users[data.user];
  var channel;
  var messageData = data.toJSON();
  var message = "";

  if (messageData && messageData.text) {
    message = "" + messageData.text.trim();
  }
  
  
  var match = message.match(atReplyRE)
  
  // Are they talking to us?
  if (match && match[1] === slack.self.id) {

    message = message.replace(atReplyRE, '').trim();
    if (message[0] == ':') {
        message = message.substring(1).trim();
    }

    bot.reply(user.name, message, function(err, reply){
      // We reply back direcly to the user

      switch (replyType) {
        case "direct": 
          channel = slack.getChannelGroupOrDMByName(user.name);
          break;
        case "atReply": 
          reply.string = "@" + user.name  + " " + reply.string;
          channel = slack.getChannelGroupOrDMByID(messageData.channel);
          break;
        case "public":
          channel = slack.getChannelGroupOrDMByID(messageData.channel);
          break

      }
      if (reply.string) {
        channel.send(reply.string);
      }
        
    });

  } else if (messageData.channel[0] == "D") {
    bot.reply(user.name, message, function(err, reply){
      channel = slack.getChannelGroupOrDMByName(user.name);
      if (reply.string) {
        channel.send(reply.string);
      }
    });
  } else {
    console.log("Ignoring...", messageData)
  }
}

// Main entry point
new superscript('./data.json', options, function(err, botInstance){
  botHandle(null, botInstance);
});
