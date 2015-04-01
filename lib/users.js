var fs      = require("fs");
var _       = require("underscore");
var debug   = require("debug")("User");
var dWarn   = require("debug")("User:Warning");
var Utils   = require("./utils");
var findOrCreate = require('mongoose-findorcreate');
var mkdirp = require("mkdirp");

var UX = function(mongoose, sfacts) {

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
      __history__ : {
        input : [],
        reply : [],
        topic : []
      }
  });

  userSchema.pre('save', function (next) {
    this.__history__.input = this.__history__.input.slice(0,15);
    this.__history__.reply = this.__history__.reply.slice(0,15);
    this.__history__.topic = this.__history__.topic.slice(0,15);
    next();
  });

  userSchema.methods.setTopic = function (topic) {
    if (topic !== "" || topic !== "undefined") {
      debug("setTopic", topic);
      this.pendingTopic = topic;
      this.save();
    } else {
      dWarn("Trying to set topic to someting invalid");
    }
  };

  userSchema.methods.getTopic = function () {
    debug("getTopic", this.currentTopic);
    return this.currentTopic;
  };

  userSchema.methods.updateHistory = function (msg, reply) {
    if (!_.isNull(msg)) {
      this.lastMessageSentAt = new Date();
    }

    if (_.isArray(msg) && !_.isNull(msg)) {
      fs.appendFileSync(process.cwd() + "/logs/" + this.id + "_trans.txt", msg[0].toLog("user"));
    } else {
      if (!_.isNull(msg)) {
        fs.appendFileSync(process.cwd() + "/logs/" + this.id + "_trans.txt", msg.toLog("user"));
      }
    }

    if (_.isArray(reply) && !_.isNull(reply)) {
      fs.appendFileSync(process.cwd() + "/logs/" + this.id + "_trans.txt", reply[0].toLog("bot"));
    } else if (!_.isEmpty(reply)) {
      fs.appendFileSync(process.cwd() + "/logs/" + this.id + "_trans.txt", reply.toLog("bot"));
    }

    // Did we successfully volley?
    // In order to keep the conversation flowing we need to have rythum and this means we always
    // need to continue to engage.
    if (reply.isQuestion) {
      this.volley = 1;
      this.rally++;
    } else {
      // We killed the rally
      this.volley = 0;
      this.rally = 0;
    }

    this.conversation++;
    debug("Updating History");

    this.__history__.input.unshift(msg);
    this.__history__.reply.unshift(reply);
    this.__history__.topic.unshift(this.currentTopic);

    if (this.pendingTopic !== undefined && this.pendingTopic !== "") {
      this.currentTopic = this.pendingTopic;
    }
  };


  userSchema.methods.getVar = function (key, cb) {
    debug("getVar", key);

    this.memory.db.get({subject:key, predicate: this.id}, function resultHandle(err, res){
      if (res && res.length !== 0) {
        cb(err, res[0].object);
      } else {
        cb(err, null);
      }
    });
  };

  userSchema.methods.setVar = function(key, value, cb) {
    debug("setVar", key, value);
    var that = this;

    that.memory.db.get({subject:key, predicate: that.id}, function(err, results) {
      if (!_.isEmpty(results)) {
        that.memory.db.del(results[0], function(){
          that.memory.db.put({subject:key, predicate: that.id, object:value}, function(){
            cb();
          });
        });
      } else {
        that.memory.db.put({subject:key, predicate:that.id, object:value}, function(err){
          cb();
        });
      }
    });
  };

  userSchema.plugin(findOrCreate);
  userSchema.virtual('memory').get(function () {
    return sfacts.createUserDB(this.id);
  });

  return mongoose.model('User', userSchema);
};


module.exports = UX;
