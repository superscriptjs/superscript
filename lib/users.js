var fs = require("fs");
var _ = require("lodash");
var debug = require("debug-levels")("SS:User");
var findOrCreate = require("mongoose-findorcreate");
var mkdirp = require("mkdirp");

var UX = function (mongoose, sfacts) {

  mkdirp.sync(process.cwd() + "/logs/");

  var userSchema = mongoose.Schema({
      id: String,
      status: Number,
      currentTopic: String,
      pendingTopic: String,
      conversationStartedAt: Date,
      lastMessageSentAt: Date,
      volley: Number,
      rally: Number,
      conversation: Number,
      prevAns: Number,
      slot1: Object,
      slot2: Object,
      conversationState: Object,
      __history__: {
        input: [],
        reply: [],
        topic: [],
        stars: []
      }
  });

  userSchema.pre("save", function (next) {
    this.__history__.input = this.__history__.input.slice(0, 15);
    this.__history__.reply = this.__history__.reply.slice(0, 15);
    this.__history__.topic = this.__history__.topic.slice(0, 15);
    this.__history__.stars = this.__history__.stars.slice(0, 15);
    next();
  });

  userSchema.methods.clearConversationState = function(callback) {
    this.conversationState = {};
    this.save(callback);
  };

  userSchema.methods.setTopic = function (topic) {
    if (topic !== "" || topic !== "undefined") {
      debug.verbose("setTopic", topic);
      this.pendingTopic = topic;
      this.save();
    } else {
      debug.warn("Trying to set topic to someting invalid");
    }
  };

  userSchema.methods.getTopic = function () {
    debug.verbose("getTopic", this.currentTopic);
    return this.currentTopic;
  };

  userSchema.methods.updateHistory = function (msg, reply, replyObj, cb) {
    var stars = replyObj.stars;
    var self = this;

    if (!_.isNull(msg)) {
      this.lastMessageSentAt = new Date();
    }

    // New Log format.
    var log = {
      user_id: this.id,
      raw_input: msg.original,
      normalized_input: msg.clean,
      matched_gambit: replyObj.minMatchSet,
      final_output: reply.clean,
      timestamp: msg.createdAt
    }
    
    fs.appendFileSync(process.cwd() + "/logs/" + this.id + "_trans.txt", JSON.stringify(log) + "\r\n");

    // Did we successfully volley?
    // In order to keep the conversation flowing we need to have rythum and this means we always
    // need to continue to engage.
    if (reply.isQuestion) {
      this.volley = 1;
      this.rally = this.rally + 1;
    } else {
      // We killed the rally
      this.volley = 0;
      this.rally = 0;
    }

    this.conversation = this.conversation + 1;

    debug.verbose("Updating History");
    msg.messageScope = null;

    this.__history__.stars.unshift(stars);
    this.__history__.input.unshift(msg);
    this.__history__.reply.unshift(reply);
    this.__history__.topic.unshift(this.currentTopic);

    if (this.pendingTopic !== undefined && this.pendingTopic !== "") {
      var pt = this.pendingTopic;
      this.pendingTopic = null;
      Topic.findOne({name:pt}, function(err, topicData) {
        if (topicData && topicData.nostay === true) {
          self.currentTopic = self.__history__.topic[0];
        } else {
          self.currentTopic = pt;
        }
        cb();
      });
    } else {
      cb();
    }
  };


  userSchema.methods.getVar = function (key, cb) {
    debug.verbose("getVar", key);

    this.memory.db.get({subject: key, predicate: this.id}, function resultHandle(err, res) {
      if (res && res.length !== 0) {
        cb(err, res[0].object);
      } else {
        cb(err, null);
      }
    });
  };

  userSchema.methods.setVar = function (key, value, cb) {
    debug.verbose("setVar", key, value);
    var self = this;

    self.memory.db.get({subject: key, predicate: self.id}, function (err, results) {
      if (err) {
        console.log(err);
      }

      if (!_.isEmpty(results)) {
        self.memory.db.del(results[0], function () {
          var opt = {subject: key, predicate: self.id, object: value};
          self.memory.db.put(opt, function () {
            cb();
          });
        });
      } else {
        var opt = {subject: key, predicate: self.id, object: value};
        self.memory.db.put(opt, function (err2) {
          if (err2) {
            console.log(err2);
          }

          cb();
        });
      }
    });
  };

  userSchema.plugin(findOrCreate);
  userSchema.virtual("memory").get(function () {
    return sfacts.createUserDB(this.id);
  });

  return mongoose.model("User", userSchema);
};


module.exports = UX;
