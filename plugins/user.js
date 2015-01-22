var debug = require("debug")("UserFacts");
var _ = require("underscore");
exports.save = function(key, value, cb) {
	var memory = this.user.memory;
	var userId = this.user.id;

  memory.db.get({subject:key, predicate: userId }, function(err, results) {
    if (!_.isEmpty(results)) {
      memory.db.del(results[0], function(){
        memory.db.put({subject:key, predicate: userId, object: value}, function(){
          cb(null,"");
        });
      });
    } else {
      memory.db.put({subject:key, predicate: userId, object: value}, function(err){
        cb(null, "");
      });  
    }
  });

}

exports.get = function(key, cb) {
	
	var memory = this.user.memory;
	var userId = this.user.id;

  debug("getVar", key, userId);
  
  memory.db.get({subject:key, predicate: userId}, function resultHandle(err, res){
    if (res && res.length != 0) {
      cb(err, res[0].object);
    } else {
      cb(err, null);
    }
  });
}

exports.createUserFact = function(s,v,o,cb) {
	this.user.memory.create(s,v,o,false, function(){
		cb(null,"");
	});
}