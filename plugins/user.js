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

exports.hasItem = function(key, bool, cb) {
  
  var memory = this.user.memory;
  var userId = this.user.id;

  debug("getVar", key, bool, userId);
  memory.db.get({subject:key, predicate: userId}, function resultHandle(err, res){
    if (!_.isEmpty(res)) {
      cb(null, (bool == "true") ? true : false)
    } else {
      cb(null, (bool == "false") ? true : false)
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
      cb(err, "");
    }
  });
}

exports.createUserFact = function(s,v,o,cb) {
  this.user.memory.create(s,v,o,false, function(){
    cb(null,"");
  });
}


exports.known = function(bool, cb) {
  var memory = this.user.memory;
  var name = (this.message.names && !_.isEmpty(this.message.names)) ? this.message.names[0] : "";
  memory.db.get({subject:name.toLowerCase()}, function resultHandle(err, res1){    
    memory.db.get({object:name.toLowerCase()}, function resultHandle(err, res2){
      
      if (_.isEmpty(res1) && _.isEmpty(res2)) {
        cb(null, (bool == "false") ? true : false)
      } else {
        cb(null, (bool == "true") ? true : false)
      }
    });
  });
}


exports.inTopic = function(topic, cb) {
  if (topic == this.user.currentTopic) {
    cb(null, "true");
  } else {
    cb(null, "false");
  }   
}