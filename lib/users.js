var FactSystem = require("./factSystem");

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