var util = require("util");
var events = require("events");
var EventEmitter = events.EventEmitter;
var async = require("async");
var qtypes = require("qtypes");
var _ = require("lodash");
var norm = require("node-normalizer");
var requireDir = require("require-dir");
var debug = require("debug-levels")("SS:Script");
var facts = require("sfacts");
var gTopicsSystem = require("./lib/topics/index");
var Message = require("./lib/message");
var Users = require("./lib/users");
var getreply = require("./lib/getreply");
var Utils = require("./lib/utils");
var processHelpers = require("./lib/reply/common");
var mergex = require("deepmerge");

function SuperScript(options, callback) {
  EventEmitter.call(this);
  var mongoose;
  var self = this;
  options = options || {};

  // Create a new connection if non is provided.
  if (options.mongoose) {
    mongoose = options.mongoose;
  } else {
    mongoose = require("mongoose");
    mongoose.connect("mongodb://localhost/superscriptDB");
  }

  this._plugins = [];
  this.normalize = null;
  this.question = null;
  
  Utils.mkdirSync("./plugins");
  this.loadPlugins("./plugins");
  this.loadPlugins(process.cwd() + "/plugins");
  // this.intervalId = setInterval(this.check.bind(this), 500);

  this.factSystem = options.factSystem ? options.factSystem : facts.create("systemDB");
  this.topicSystem = gTopicsSystem(mongoose, this.factSystem);

  // This is a kill switch for filterBySeen which is useless in the editor.
  this.editMode = options.editMode || false;

  // We want a place to store bot related data
  this.memory = options.botfacts ? options.botfacts : this.factSystem.createUserDB("botfacts");

  this.scope = {};
  this.scope = _.extend(options.scope || {});
  this.scope.bot = this;
  this.scope.facts = this.factSystem;
  this.scope.topicSystem = this.topicSystem;
  this.scope.botfacts = this.memory;
  this.users = new Users(mongoose, this.factSystem);

  norm.loadData(function () {
    self.normalize = norm;
    new qtypes(function (question) {
      self.question = question;
      debug.verbose("System Loaded, waiting for replies");
      callback(null, self);
    });
  });
}

var messageItorHandle = function (user, system) {
  var messageItor = function (msg, next) {

    var options = {
      user: user,
      system: system,
      message: msg
    };

    processHelpers.getTopic(options.system.topicsSystem, system.topicName, function (err, topicData) {
      if (topicData) {
        options.aTopics = [];
        options.aTopics.push(topicData);        
      }

      getreply(options, function (err, replyObj) {
        // Convert the reply into a message object too.

        var msgString = "";
        var messageOptions = {
          qtypes: system.question,
          norm: system.normalize,
          facts: system.facts
        };

        if (replyObj) {
          messageOptions.replyId = replyObj.replyId;
          msgString = replyObj.string;

          if (replyObj.clearConvo) {
            messageOptions.clearConvo = replyObj.clearConvo;
          }

        } else {
          replyObj = {};
        }

        new Message(msgString, messageOptions, function (replyMessageObject) {
          user.updateHistory(msg, replyMessageObject, replyObj, function(err, log) {

            // We send back a smaller message object to the clients.
            var clientObject = {
              replyId: replyObj.replyId,
              createdAt: replyMessageObject.createdAt || new Date(),
              string: msgString || "", // replyMessageObject.raw || "",
              topicName: replyObj.topicName,
              subReplies: replyObj.subReplies,
              debug: log
            };

            var newClientObject = mergex(clientObject, replyObj.props || {});

            user.save(function (err, res) {
              debug.verbose(err, res);
              // TODO - Seeing RangeError here. (investigate Mongoose 4.0)
              return next(null, newClientObject);
            });
          });
        });
      });
    });
  };

  return messageItor;
};

// This takes a message and breaks it into chucks to be passed though
// the sytem. We put them back together on the other end.
// FIXME: with chunking removed this is not needed.
var messageFactory = function (options, cb) {
  
  var rawMsg = options.msg;
  var normalize = options.normalize;
  var messageParts = [];
  
  var cleanMsg = normalize.clean(rawMsg).trim();
  debug.verbose("IN MessageFactory", cleanMsg);
  
  var messageOptions = {
    qtypes: options.question,
    norm: normalize,
    facts: options.factSystem,
    original: rawMsg
  };

  return new Message(cleanMsg, messageOptions, function (tmsg) {
    var mset = _.isEmpty(tmsg) ? [] : [tmsg]
    return cb(null, mset);
  });
};

util.inherits(SuperScript, EventEmitter);

SuperScript.prototype.message = function (msgString, callback) {

  var messageOptions = {
    qtypes: this.question,
    norm: this.normalize,
    facts: this.factSystem
  };

  var message = new Message(msgString, messageOptions, function (msgObj) {
    callback(null, msgObj);
  });
};

// This is like doing a topicRedirect
SuperScript.prototype.directReply = function (userId, topic, msg, callback) {
  debug.log("[ New DirectReply - '" + userId + "']- " +  msg);
  var options = {
    userId: userId,
    topicName: topic,
    msgString: msg,
    extraScope: {}
  };

  this._reply(options, callback);

};

// Convert msg into message object, then check for a match
SuperScript.prototype.reply = function (userId, msg, callback, extraScope) {
  if (arguments.length === 2 && typeof msg === "function") {
    callback = msg;
    msg = userId;
    userId = Math.random().toString(36).substr(2, 5);
    extraScope = {};
  }

  debug.log("[ New Message - '" + userId + "']- " +  msg);
  var options = {
    userId: userId,
    msgString: msg,
    extraScope: extraScope
  };

  this._reply(options, callback);
};

SuperScript.prototype._reply = function(options, callback) {
  var self = this;

  // Ideally these will come from a cache, but self is a exercise for a rainy day
  var system = {

    // getReply
    topicsSystem: self.topicSystem,
    plugins: self._plugins,
    scope: self.scope,
    messageScope: options.extraScope,

    // Pass in the topic if it
    topicName: options.topicName || null,

    // Message
    question: self.question,
    normalize: self.normalize,
    facts: self.factSystem,
    editMode: self.editMode
  };

  var prop = {
    currentTopic: "random",
    status: 0,
    conversation: 0, volley: 0, rally: 0
  };

  this.users.findOrCreate({ id: options.userId }, prop, function (err1, user) {
    if (err1) {
      debug.error(err1);
    }

    var opt = {
      msg: options.msgString,
      question: self.question,
      normalize: self.normalize,
      factSystem: self.factSystem
    };

    messageFactory(opt, function (err, messages) {
      // FIXME: `messages` will always be one now that we no longer chunk
      async.mapSeries(messages, messageItorHandle(user, system), function (err2, messageArray) {
        if (err2) {
          debug.error(err2);
        }

        var reply = {};
        var messageArray = Utils.cleanArray(messageArray);

        if (_.isEmpty(messageArray)) {
          reply.string = "";
        } else if (messageArray.length === 1) {
          reply = messageArray[0];
        }

        debug.verbose("Update and Reply to user '" + user.id + "'", reply);
        debug.info("[ Final Reply - '" + user.id + "']- '" + reply.string + "'");

        return callback(err2, reply);
      });
    });
  });
}


SuperScript.prototype.loadPlugins = function (path) {
  var plugins = requireDir(path);

  for (var file in plugins) {
    for (var func in plugins[file]) {
      debug.verbose("Loading Plugin", path, func);
      this._plugins[func] = plugins[file][func];
    }
  }
};

SuperScript.prototype.getPlugins = function () {
  return this._plugins;
};

SuperScript.prototype.getTopics = function () {
  return this.topics;
};

SuperScript.prototype.getUsers = function (cb) {
  this.users.find({}, "id", cb);
};

SuperScript.prototype.getUser = function (userId, cb) {
  this.users.findOne({id: userId}, function (err, usr) {
    cb(err, usr);
  });
};

SuperScript.prototype.findOrCreateUser = function (userId, callback) {
  var properties = { id: userId };
  var prop = {
    currentTopic: "random",
    status: 0,
    conversation: 0, volley: 0, rally: 0
  };

  this.users.findOrCreate(properties, prop, callback);
};

module.exports = SuperScript;
