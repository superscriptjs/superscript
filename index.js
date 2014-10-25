var fs      = require("fs");
var async   = require("async");
var qtypes  = require("qtypes");
var Message = require("./lib/message");
var Users   = require("./lib/users");
var getreply      = require("./lib/getreply");
var processTags   = require("./lib/processtags");
var reason        = require("./lib/reason/reason");
var concepts      = require("./lib/concepts");
var Utils   = require("./lib/utils");
var _       = require("underscore");
var norm    = require("node-normalizer");
var requireDir = require('require-dir');
var debug   = require("debug")("Script");
var dWarn   = require("debug")("Script:Warning");

function SuperScript(botScript, options, callback) {

  if (!botScript) {
    dWarn("No Script file found");
    throw new Error("No Script file found");
  }

  var that = this;
  options = options || {};
  options.conceptnet = options.conceptnet || {host:'127.0.0.1', user:'root', pass:''}
  
  this.cnet = require("conceptnet")(options.conceptnet);
  this.reasoning  = (options.reasoning === undefined) ? true : options.reasoning;
  this._users = {}; // 'user' variables
  this._plugins = [];

  // TODO - Read in the data folder
  var worldData = [
    './data/bot.tbl',
    './data/adjectivehierarchy.top',
    './data/adverbhierarchy.top',
    './data/affect.top',
    './data/concepts.top',
    './data/names.top',
    './data/oppisite_tiny.tbl',
    './data/prepositionhierarchy.top',
    './data/verbhierarchy.top',
    './data/world/animals.tbl',
    './data/world/color.tbl',
    './data/world/basicgeography.tbl'
  ];

  this._worldData = _.extend(options.worldData || {} , worldData);
  this.normalize = null;
  this.question  = null;

  this.loadPlugins("./plugins");
  this.loadPlugins(process.cwd() + "/plugins");
  

  var data = JSON.parse(fs.readFileSync(botScript,'utf8'));
  this._sorted      = data.gSorted;
  this._thats       = data.gPrevTopics;
  this._topics      = data.gTopics;
  this._topicFlags  = data.gTopicFlags;

  // this._includes = {}; // included topics
  // this._lineage  = {}; // inherited topics

  concepts.readFiles(this._worldData, function(facts) {
    that.facts = facts;
    norm.loadData(function() {
      that.normalize = norm;
      new qtypes(function(question) {
        debug("Questions Loaded");
        that.question = question;
        debug("System Loaded, waiting for replies");
        callback(null, that);
      });
    });
  });
}

var messageItorHandle = function(user, system) {
  return messageItor = function(msg, next) {
    var internalizeHandle = function(){
  
      var options = {
        user: user,
        type: "normal",
        system: system
      }

      if (system.topics["__begin__"]) {
        debug("Begin getreply");
        // TOOD - This needs to be callback diven
        options.message = new Message("request", system.question, system.normalize, system.cnet, system.facts);
        options.type = "begin";

        getreply(options,  function(err, begin){
          // Okay to continue?
          if (begin.indexOf("{ok}") > -1) {
            debug("Normal getreply");

            options.message = msg;
            options.type = "normal";

            getreply(options, function(err, reply2){
              if (err) { 
                next(err, null);
              } else {
                reply2 = begin.replace(/\{ok\}/g, reply2);  
                var pOptions = {
                  msg: msg, reply: reply2, 
                  stars: [], botstars:[],
                  user: user, 
                  system: system
                };
                processTags(pOptions, function(err, reply){
                  new Message(reply, system.question, system.normalize, system.cnet, system.facts, function(replyObj) {
                    user.updateHistory(msg, replyObj);
                    return next(err, reply);
                  });
                });
              }
            });
          } else {
            next(err, begin);
          }
        });
        
      } else {
        debug("Normal getreply");
        options.message = msg;
        options.type = "normal";

        getreply(options, function(err, reply){
          new Message(reply, system.question, system.normalize, system.cnet, system.facts, function(replyObj) {
            user.updateHistory(msg, replyObj);
            return next(err, reply);
          });
        });
      }
    }

    // We have an option to completly disable reasoning entirly.
    if (system.reasoning) {
      reason.internalizeMessage(msg, user, system.facts, system.cnet, internalizeHandle);
    } else {
      internalizeHandle();
    }
  }
}

// This takes a message and breaks it into chucks to be passed though 
// the sytem. We put them back together on the other end.
var messageFactory = function(rawMsg, question, normalize, cnet, facts, cb) {

  rawMsg = normalize.clean(rawMsg).trim();
  var messageParts = Utils.sentenceSplit(rawMsg);
  messageParts = Utils.cleanArray(messageParts);

  var itor = function(messageChunk, next) {
    new Message(messageChunk.trim(), question, normalize, cnet, facts, function(tmsg) {
      next(null, tmsg); 
    });
  }

  return async.mapSeries(messageParts, itor, function(err, messageArray) {
    return cb(messageArray);
  })
}

// Convert msg into message object, then check for a match
SuperScript.prototype.reply = function(userName, msg, callback) {
  if (arguments.length == 2 && typeof msg == "function") {
    callback = msg;
    msg = userName;
    userName = "randomUser";
  }

  debug("Message Recieved from '" + userName + "'", msg);
  var that = this;
  
  // Ideally these will come from a cache, but that is a exercise for a rainy day
  var system = {
    topicFlags: that._topicFlags,
    sorted: that._sorted, 
    topics: that._topics, 
    thats: that._thats,

    plugins: that._plugins,
    question: that.question, 
    normalize: that.normalize,
    reasoning: that.reasoning,
    facts: that.facts, 
    cnet: that.cnet
  }

  var user = Users.findOrCreate(userName);
  messageFactory(msg, that.question, that.normalize, that.cnet, that.facts, function(messages) {

    async.mapSeries(messages, messageItorHandle(user, system), function(err, messageArray) {
      var reply = "";
      messageArray = Utils.cleanArray(messageArray);
      
      if (messageArray.length == 1) {
        reply = messageArray[0];
      } else {
        // TODO - We will want to add some smarts on putting multiple
        // lines back together - check for tail grammar or drop bits.
        reply = messageArray.join(" ");
      }

      debug("Update and Reply to user '" + user.name + "'", reply);
      return callback(null, reply);
    });
  });

}

SuperScript.prototype.getUser = function(userName) {
  debug("Fetching User", userName);
  return Users.get(userName);
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

module.exports = SuperScript;