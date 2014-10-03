var FactSystem = require("./factSystem");
var fs 			= require("fs");
var _ 			= require("underscore");
var debug   = require("debug")("User");
var dWarn 	= require("debug")("User:Warning");

Users = {
	_users: [],

	findOrCreate : function(userName) {
		if (this._users[userName] == undefined) {
			this._users[userName] = new User(userName);
		}
		return this._users[userName];
	}, 

	get: function(userName) {
		return this._users[userName];		
	}
}

function User(name) {
	this.name = name;
	this.currentTopic = "random";
	this.pendingTopic;
	this.memory = new FactSystem();

	// A Volley is a single sucessul reply
	// It can be 0 or 1
	this.volley = 0; 

	// A rally is a collection of vollies 
	this.rally  = 0;

	this['__history__'] = { 'input': new Array(30), 'reply': new Array(30), 'topic': new Array(30) };
}

User.prototype.setTopic = function(topic) {
	if (topic != "" || topic != "undefined") {
		debug("setTopic", topic);
		this.pendingTopic = topic;
	} else {
		dWarn("Trying to set topic to someting invalid");
	}
}

User.prototype.set = function(key, value) {
	debug("setVar", key, value);
	this.memory.createfact(key, "userProp", value)
}

User.prototype.get = function(key) {
	debug("getVar", key);
	var res = this.memory.query("direct_sv", key, "userProp");
	debug("Memory Lookup", key, res);
	return res;
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
	if (_.isArray(msg) && msg != "undefined") {
		fs.appendFileSync(process.cwd() + "/logs/" + this.name + "_trans.txt", msg[0].toLog("user"));	
	} else {
		fs.appendFileSync(process.cwd() + "/logs/" + this.name + "_trans.txt", msg.toLog("user"));	
	}
	
	if (_.isArray(reply) && reply != "undefined") {
		fs.appendFileSync(process.cwd() + "/logs/" + this.name + "_trans.txt", reply[0].toLog("bot"));
	} else if (!_.isEmpty(reply)) {
		fs.appendFileSync(process.cwd() + "/logs/" + this.name + "_trans.txt", reply.toLog("bot"));
	}

	// Did we successfully volley?
	// In order to keep the conversation flowing we need to have rythum and this means we always 
	// need to continue to engague.
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