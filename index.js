var util = require("util");
var events = require("events");
var EventEmitter = events.EventEmitter;
var async = require("async");
var qtypes = require("qtypes");
var _ = require("lodash");
var norm = require("node-normalizer");
var requireDir = require("require-dir");
var debug = require("debug")("Script");
var facts = require("sfacts");
var gTopicsSystem = require("./lib/topics/index");
var Message = require("./lib/message");
var Users = require("./lib/users");
var getreply = require("./lib/getreply");
var Utils = require("./lib/utils");
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
  this.scope.facts = this.factSystem;
  this.scope.topicSystem = this.topicSystem;
  this.scope.botfacts = this.memory;

  this.users = new Users(mongoose, this.factSystem);

  norm.loadData(function () {
    self.normalize = norm;
    new qtypes(function (question) {
      self.question = question;
      debug("System Loaded, waiting for replies");
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

    getreply(options, function (err, replyObj) {
      // Convert the reply into a message object too.

      var msgString = "";
      var messageOptions = {
        qtypes: system.question,
        norm: system.normalize,
        facts: system.facts
      };

      if (replyObj) {
        messageOptions.replyId = replyObj.id;
        msgString = replyObj.string;
      } else {
        replyObj = {};
      }

      new Message(msgString, messageOptions, function (replyMessageObject) {
        user.updateHistory(msg, replyMessageObject);

        // We send back a smaller message object to the clients.
        var clientObject = {
          replyId: replyObj.replyId,
          createdAt: replyMessageObject.createdAt || new Date(),
          string: replyMessageObject.raw || "",
          gambitId: replyObj.gambitId,
          topicName: replyObj.topicName,
          subReplies: replyObj.subReplies,
        };

        var newClientObject = mergex(clientObject, replyObj.props || {});

        user.save(function () {
          return next(err, newClientObject);
        });
      });
    });
  };
  return messageItor;
};

// This takes a message and breaks it into chucks to be passed though
// the sytem. We put them back together on the other end.
var messageFactory = function (rawMsg, question, normalize, facts, cb) {

  var messageParts = Utils.sentenceSplit(normalize.clean(rawMsg).trim());

  messageParts = Utils.cleanArray(messageParts);

  var itor = function (messageChunk, next) {

    var messageOptions = {
      qtypes: question,
      norm: normalize,
      facts: facts,
      original: rawMsg
    };

    new Message(messageChunk.trim(), messageOptions, function (tmsg) {
      next(null, tmsg);
    });
  };

  return async.mapSeries(messageParts, itor, function (err, messageArray) {
    return cb(messageArray);
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


// Convert msg into message object, then check for a match
SuperScript.prototype.reply = function (userId, msg, callback) {
  if (arguments.length === 2 && typeof msg === "function") {
    callback = msg;
    msg = userId;
    userId = Math.random().toString(36).substr(2, 5);
  }

  debug("Message Recieved from '" + userId + "'", msg);
  var self = this;

  // Ideally these will come from a cache, but self is a exercise for a rainy day
  var system = {

    // getReply
    topicsSystem: self.topicSystem,
    plugins: self._plugins,
    scope: self.scope,

    // Message
    question: self.question,
    normalize: self.normalize,
    facts: self.factSystem,
    editMode: self.editMode
  };

  var properties = { id: userId };
  var prop = {
    currentTopic: "random",
    status: 0,
    conversation: 0, volley: 0, rally: 0
  };

  this.users.findOrCreate(properties, prop, function (err1, user) {
    if (err1) {
      console.log(err1);
    }
    messageFactory(msg, self.question, self.normalize, self.factSystem, function (messages) {
      async.mapSeries(messages, messageItorHandle(user, system), function (err2, messageArray) {
        if (err2) {
          console.log(err2);
        }

        var reply = {};
        messageArray = Utils.cleanArray(messageArray);

        if (_.isEmpty(messageArray)) {
          reply.string = "";
        } else if (messageArray.length === 1) {
          reply = messageArray[0];
        } else {
          // TODO - We will want to add some smarts on putting multiple
          // lines back together - check for tail grammar or drop bits.
          reply = messageArray[0];
          var messageReplies = [];
          reply.parts = [];
          for (var i = 0; i < messageArray.length; i++) {
            reply.parts[i] = {
              string: messageArray[i].string,
              threads: messageArray[i].threads,
              triggerId: messageArray[i].triggerId,
              topicName: messageArray[i].topicName
            };

            if (messageArray[i].string !== "") {
              messageReplies.push(messageArray[i].string);
            }

            for (var nprop in messageArray[i]) {
              if (nprop !== "createdAt" && nprop !== "string") {
                reply[nprop] = messageArray[i][nprop];
              }
            }
          }

          reply.string = messageReplies.join(" ");
        }

        debug("Update and Reply to user '" + user.id + "'", reply);

        // If we have a thread of messages, lets space them out.
        if (reply.subReplies) {
          
        }

        return callback(err2, reply);
      });
    });
  });
};

SuperScript.prototype.loadPlugins = function (path) {
  var plugins = requireDir(path);

  for (var file in plugins) {
    for (var func in plugins[file]) {
      debug("Loading Plugin", path, func);
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
  debug("Fetching User", userId);

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
