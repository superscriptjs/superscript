var fs = require("fs");
var util = require("util");
var events = require('events');
var EventEmitter = events.EventEmitter;
var async = require("async");
var qtypes = require("qtypes");
var _ = require("underscore");
var norm = require("node-normalizer");
var requireDir = require('require-dir');
var debug = require("debug")("Script");
var dWarn = require("debug")("Script:Warning");
var facts = require("sfacts");

var TopicsSystem = require("./lib/topics/index");

var Topics = require("./lib/topics");
var Message = require("./lib/message");
var Users = require("./lib/users");
var getreply = require("./lib/getreply");
var processTags = require("./lib/processtags");
var Utils = require("./lib/utils");

var mergex = require('deepmerge');

function SuperScript(options, callback) {
  EventEmitter.call(this);
  var mongoose;
  var that = this;
  options = options || {};
  
  // Create a new connection if non is provided.
  if (options.mongoose) {
    mongoose = options.mongoose;
  } else {
    mongoose = require('mongoose');
    mongoose.connect('mongodb://localhost/superscriptDB');
  }

  this._plugins = [];
  this.normalize = null;
  this.question  = null;

  Utils.mkdirSync("./plugins");
  this.loadPlugins("./plugins");
  this.loadPlugins(process.cwd() + "/plugins");
  // this.intervalId = setInterval(this.check.bind(this), 500);
  
  this.factSystem = (options.factSystem) ? options.factSystem : facts.create("systemDB");
  this.topicSystem = TopicsSystem(mongoose, this.factSystem);

  // We want a place to store bot related data
  this.memory = (options.botfacts) ? options.botfacts : this.factSystem.createUserDB("botfacts");

  this.scope = {};
  this.scope = _.extend(options.scope || {});
  this.scope.facts = this.factSystem;
  this.scope.topicSystem = this.topicSystem;
  this.scope.botfacts = this.memory;

  this.users = new Users(mongoose, this.factSystem);

  norm.loadData(function() {
    that.normalize = norm;
    new qtypes(function(question) {
      that.question = question;
      debug("System Loaded, waiting for replies");
      callback(null, that);
    });
  });
}

var messageItorHandle = function(user, system) {
  return messageItor = function(msg, next) {
    
    var options = {
      user: user,
      system: system,
      message: msg
    };

    getreply(options, function(err, replyObj) {
      // Convert the reply into a message object too.
    
      var msgString = "";
      var messageOptions = {
        qtypes: system.question,
        norm: system.normalize,
        facts: system.facts
      };

      if (replyObj) {
        messageOptions['replyId'] = replyObj.id;  
        msgString = replyObj.string;
      } else {
        replyObj = {};
      }

      new Message(msgString, messageOptions,  function(replyMessageObject) {
        user.updateHistory(msg, replyMessageObject);

        // We send back a smaller message object to the clients.
        var clientObject = {
          replyId: replyObj.replyId,
          createdAt: replyMessageObject.createdAt || new Date(),
          string: replyMessageObject.raw || "",
          gambitId: replyObj.gambitId,
          topicName: replyObj.topicName
        };

        var clientObject =  mergex(clientObject, replyObj.props || {});

        user.save(function(e,r,s){
          return next(err, clientObject);  
        });
      });
    });
  }
}

// This takes a message and breaks it into chucks to be passed though 
// the sytem. We put them back together on the other end.
var messageFactory = function(rawMsg, question, normalize, facts, cb) {

  var rawMsg = normalize.clean(rawMsg).trim();
  var messageParts = Utils.sentenceSplit(rawMsg);
  messageParts = Utils.cleanArray(messageParts);

  var itor = function(messageChunk, next) {
    
    var messageOptions = {
      qtypes: question, 
      norm: normalize, 
      facts: facts
    };

    new Message(messageChunk.trim(), messageOptions, function(tmsg) {
      next(null, tmsg); 
    });
  }

  return async.mapSeries(messageParts, itor, function(err, messageArray) {
    return cb(messageArray);
  });
}

util.inherits(SuperScript, EventEmitter);

SuperScript.prototype.message = function(msgString, callback) {

  var messageOptions = {
    qtypes: this.question, 
    norm: this.normalize, 
    facts: this.factSystem
  };

  new Message(msgString, messageOptions,  function(msgObj) {
    callback(null, msgObj);
  });
}


// Convert msg into message object, then check for a match
SuperScript.prototype.reply = function(userId, msg, callback) {
  if (arguments.length === 2 && typeof msg == "function") {
    callback = msg;
    msg = userId;
    userId = Math.random().toString(36).substr(2, 5);
  }

  debug("Message Recieved from '" + userId + "'", msg);
  var that = this;
  
  // Ideally these will come from a cache, but that is a exercise for a rainy day
  var system = {
    
    // getReply
    topicsSystem: that.topicSystem,
    plugins: that._plugins,
    scope: that.scope,

    // Message 
    question: that.question, 
    normalize: that.normalize,
    facts: that.factSystem
  }

    var properties = { id: userId };
    var prop = {
      currentTopic :'random', 
      status:0, 
      conversation: 0, volley: 0, rally:0
    };

  this.users.findOrCreate(properties, prop, function(err, user, isNew){

    messageFactory(msg, that.question, that.normalize, that.factSystem, function(messages) {
      async.mapSeries(messages, messageItorHandle(user, system), function(err, messageArray) {
        var reply = {};
        messageArray = Utils.cleanArray(messageArray);

        if (_.isEmpty(messageArray)) {
          reply.string = "";
        } else if (messageArray.length == 1) {
          reply = messageArray[0];
        } else {

          // TODO - We will want to add some smarts on putting multiple
          // lines back together - check for tail grammar or drop bits.
          reply = messageArray[0];
          var messageReplies = [];
          reply.parts = [];
          for (var i = 0; i < messageArray.length; i++) {
             // reply.parts[i] = JSON.parse(JSON.stringify(messageArray[i]));
             reply.parts[i] = {
                string: messageArray[i].string,
                triggerId: messageArray[i].triggerId,
                topicName: messageArray[i].topicName
              }

            if (messageArray[i].string != "") {
              messageReplies.push(messageArray[i].string);
            }
            
            for (var prop in messageArray[i]) {
              if (prop != "createdAt" && prop != "string") {
                reply[prop] = messageArray[i][prop];
              }
            }
          }

          reply.string = messageReplies.join(" ");
        }

        debug("Update and Reply to user '" + user.id + "'", reply);
        return callback(err, reply);
      });
    });
  });
}

SuperScript.prototype.loadPlugins = function(path) {
  var plugins = requireDir(path);

  for (var file in plugins) {
    for (var func in plugins[file]) {
      debug("Loading Plugin", path, func)
      this._plugins[func] = plugins[file][func];
    }
  }
}

SuperScript.prototype.getPlugins = function() {
  return this._plugins;
}

SuperScript.prototype.getTopics = function() {
  return this.topics;
}

SuperScript.prototype.getUser = function(userId, cb) {
  debug("Fetching User", userId);

  this.users.findOne({id: userId}, function(err, usr){
    cb(err, usr);
  });
}

SuperScript.prototype.findOrCreateUser = function(userId, callback) {
  var properties = { id: userId };
  var prop = {
    currentTopic :'random', 
    status:0, 
    conversation: 0, volley: 0, rally:0
  };

  this.users.findOrCreate(properties, prop, callback);
}


// SuperScript.prototype.userConnect = function(userId, callback) {
//   debug("Connecting User", userId);
//   return Users.connect(userId, this.facts, callback);
// }

// TODO: Revisit this.
// SuperScript.prototype.userDisconnect = function(userId) {
//   debug("userDisconnect User", userId);
//   return Users.disconnect(userId);
// }

var firstReplyTime = Utils.getRandomInt(3000, 10000);
var secondReplyTime = firstReplyTime + Utils.getRandomInt(3000, 10000);

// This is really the difference between a personal assistant and
// a full blown conversation engine.
//
// This function is fired every 500ms
// We check to see who is connected to the bot, and what conversations
// are currently happening.
// We use this method to fire off messages to users who have:
// - Not yet engagued with the bot. (delayed first reply)
// - Idle for a length of time (6s ~ 20s)
// - Convesation has run dry.
//
// This method emits a "message" event on bot and sends back a userID
// so you will need to pair the user back to a socket.
//
// SuperScript.prototype.check = function() {
//   var that = this;
//   var users = Users.getOnline();
//   var currentTimestamp = (new Date()).getTime();
  
//   var sendMessage = function(message, user, cb) {
    
//     var gScope = that.scope;
//     gScope.user = user;

//     var options = {
//       plugins: that._plugins,
//       scope: gScope
//     };

//     // TODO - Reply Object has changed, and we need to mimic that here.
//     var reply = {};

//     processTags(reply, user, options, function afterProcessTags(err, reply){
//       var messageOptions = {
//         qtypes: that.question, 
//         norm: that.normalize, 
//         facts: that.facts
//       };
//       new Message(reply, messageOptions, function(replyObj) {

//         debug("User Saved");
//         user.updateHistory(null, replyObj);
//         that.emit('message', user.name, reply);
//         cb();

//       });
//     });
//   }

//   var itor = function(user, next) {
    
//     // Are we in a topic?
//     var currentTopic = user.getTopic();

//     var thingsToSay = [];
//     var firstToSay = [];

//     for (message in that._topics[currentTopic]) {
//       if(that._topics[currentTopic][message].say !== undefined) {
//         if(that._topics[currentTopic][message].options.index !== undefined) {
//           firstToSay.push(that._topics[currentTopic][message].say);
//         } else {
//           thingsToSay.push(that._topics[currentTopic][message].say);
//         }
//       }
//     }

//     var durationMs = currentTimestamp - user.conversationStartedAt;

//     if (user.lastMessageSentAt === null && !_.isEmpty(firstToSay)) {
//       var reply = Utils.pickItem(firstToSay);
//       // Only say the firstReply message once
//       if (durationMs > firstReplyTime && durationMs < firstReplyTime + 500) {        
//         sendMessage(reply, user, next);
//       } else if(durationMs > secondReplyTime && durationMs < secondReplyTime + 500) {
//         sendMessage(reply, user, next);
//       } else {
//         next();
//       }
      
//     } else if(!_.isEmpty(thingsToSay)) {
//       var reply = Utils.pickItem(thingsToSay);

//       // We have said something, but now the conversation is dried up.
//       // Either rally 0, or time ellapsed since last message
//       var durationMs = currentTimestamp - user.lastMessageSentAt;

//       // Some random time between 6s, and 20s
//       var ellapsedTime = firstReplyTime * 2;

//       if(durationMs > ellapsedTime && durationMs < ellapsedTime + 500) {
//         sendMessage(reply, user, next);
//       } else {
//         next();
//       }
//     } else {
//       next();
//     }
//   }

//   async.each(users, itor, function() {});
// }

module.exports = SuperScript;