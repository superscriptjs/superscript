var debug = require("debug")("UserFacts");

exports.save = function(key, value, cb) {
	this.user.set(key, value, function(){
		cb(null, "");
	});
}

exports.get = function(key, cb) {
	this.user.get(key, function(err, val){
		cb(null, val);
	});
}

exports.createUserFact = function(s,v,o,cb) {
	this.user.memory.create(s,v,o,false, function(){
		cb(null,"");
	});
}