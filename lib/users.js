var fs      = require("fs");
var _       = require("underscore");
var debug   = require("debug")("User");
var dWarn   = require("debug")("User:Warning");
var sfacts  = require("sfacts");
var Utils   = require("./utils");

Users = {
  _users: {},

  findOrCreate: function(userName, facts) {
    if (this._users[userName] == undefined) {
      this._users[userName] = new User(userName, facts);
    }
    return this._users[userName];
  }, 

  getOnline: function() {
    var u = [];
    for (user in this._users) {
      if (this._users[user].status == 1) {
        u.push(this._users[user]);
      }
    }
    return u;
  },

  get: function(userName) {
    return this._users[userName];   
  },

  connect: function(userName, facts) {
    var user = this.findOrCreate(userName, facts);
    user.status = 1;
    debug("user Connected", user);
    return user;
  },

  disconnect: function(userName) {
    var user = this.findOrCreate(userName);
    user.status = 0;
  }
}

function User(name, facts) {
  this.name = name;

  // online = 1, offline = 0;
  this.status = 0; 

  this.currentTopic = "random";
  this.pendingTopic;
  
  this.memory = facts.createUserDB(name);

  // The time the User was created - in this session.
  this.conversationStartedAt = new Date();
  this.lastMessageSentAt = null;
  
  // A Volley is a single sucessul reply
  // It can be 0 or 1
  this.volley = 0; 

  // A rally is a collection of vollies 
  this.rally  = 0;

  this['__history__'] = { 'input': new Array(30), 'reply': new Array(30), 'topic': new Array(30) };

  Utils.mkdirSync(process.cwd() + "/logs/");

}

User.prototype.setTopic = function(topic) {
  if (topic != "" || topic != "undefined") {
    debug("setTopic", topic);
    this.pendingTopic = topic;
  } else {
    dWarn("Trying to set topic to someting invalid");
  }
}

User.prototype.set = function(key, value, cb) {
  debug("setVar", key, value);
  var that = this;
  
  that.memory.db.get({subject:key, predicate: that.name}, function(err, results) {
    if (!_.isEmpty(results)) {
      that.memory.db.del(results[0], function(){
        that.memory.db.put({subject:key, predicate: that.name, object:value}, function(){
          cb();
        });
      });
    } else {
      that.memory.db.put({subject:key, predicate:that.name, object:value}, function(err){
        cb()  
      });  
    }
  });
}

User.prototype.get = function(key, cb) {
  debug("getVar", key);
  this.memory.db.get({subject:key, predicate: this.name}, function resultHandle(err, res){
    if (res && res.length != 0) {
      cb(err, res[0].object);
    } else {
      cb(err, null);
    }
  });
}

User.prototype.getTopic = function() {
  debug("getTopic", this.currentTopic);
  return this.currentTopic;
}

User.prototype.getLastMessage = function() {
  debug("getLastMessage");
  return this['__history__']["input"][0];
}

// This will keep the last
// This is saved when the message is finally delivered.
User.prototype.updateHistory = function(msg, reply) {
  
  if (!_.isNull(msg)) {
    this.lastMessageSentAt = new Date();  
  }
  
  if (_.isArray(msg) && !_.isNull(msg)) {
    fs.appendFileSync(process.cwd() + "/logs/" + this.name + "_trans.txt", msg[0].toLog("user")); 
  } else {
    if (!_.isNull(msg)) {
      fs.appendFileSync(process.cwd() + "/logs/" + this.name + "_trans.txt", msg.toLog("user"));    
    }
  }
  
  if (_.isArray(reply) && !_.isNull(reply)) {
    fs.appendFileSync(process.cwd() + "/logs/" + this.name + "_trans.txt", reply[0].toLog("bot"));
  } else if (!_.isEmpty(reply)) {
    fs.appendFileSync(process.cwd() + "/logs/" + this.name + "_trans.txt", reply.toLog("bot"));
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

  debug("Updating History");
  this['__history__']["input"].pop();
  this['__history__']["input"].unshift(msg);
  this['__history__']["reply"].pop();
  this['__history__']["reply"].unshift(reply);
  this['__history__']["topic"].pop();
  this['__history__']["topic"].unshift(this.getTopic());

  if (this.pendingTopic != undefined && this.pendingTopic != "") {
    this.currentTopic = this.pendingTopic;
  }
}


module.exports = Users;