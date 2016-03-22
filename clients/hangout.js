var xmpp 			= require('simple-xmpp');
var net             = require("net");
var superscript     = require("superscript");
var mongoose        = require("mongoose");
var facts           = require("sfacts");
var factSystem      = facts.create('hangoutFacts');

mongoose.connect('mongodb://localhost/superscriptDB');

var options = {};
var sockets = [];

var TopicSystem = require("superscript/lib/topics/index")(mongoose, factSystem);

options['factSystem'] = factSystem;
options['mongoose'] = mongoose;


//You need authorize this authentication method in Google account.
var botHandle = function(err, bot) {
  	xmpp.connect({
        jid                 : 'EMAIL ADRESS',
        password        	: 'PASSWORD',
        host                : 'talk.google.com',
        port                : 5222,
        reconnect			: true
	});

	xmpp.on('online', function(data) {
	    console.log('Connected with JID: ' + data.jid.user);
	    console.log('Yes, I\'m connected!');
	});

	xmpp.on('chat', function(from, message) {
		receiveData(from, bot, message);
	});

	xmpp.on('error', function(err) {
	    console.error(err);
	});
};

var receiveData = function(from, bot, data) {
	// Handle incoming messages.
	var message = "" + data;

	message = message.replace(/[\x0D\x0A]/g, "");

	bot.reply(from, message.trim(), function(err, reply){
		xmpp.send(from, reply.string);
	});
};

// Main entry point
TopicSystem.importerFile('./data.json', function(){
  new superscript(options, function(err, botInstance){
    botHandle(null, botInstance);
  });
});