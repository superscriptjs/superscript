var _ = require("lodash");

// This is used in a test to verify fall though works
// TODO: Move this into a fixture.
exports.bail = function(cb) {
	cb(true, null);
}

exports.one = function(cb) {
	cb(null, "one");
}

exports.num = function(n, cb) {
	cb(null, n);
}

exports.changetopic = function(n,cb) {
	this.user.setTopic(n);
	cb(null, "");
}

exports.changefunctionreply = function(newtopic,cb) {
	cb(null, "{topic="+ newtopic + "}");
}

exports.doSomething = function(cb) {
  console.log('this.message.raw', this.message.raw);
  cb(null, "function");
}

exports.break = function(cb) {
	cb(null, "", true);
}

exports.nobreak = function(cb) {
	cb(null, "", false);
}

exports.objparam1 = function(cb) {

	var data = {
    "text": "world",
    "attachments": [
      {
          "text": "Optional text that appears *within* the attachment",
      }
     ]
	}
	cb(null, data);
}

exports.objparam2 = function(cb) {
	cb(null, {test: "hello", text: "world"});
}


exports.showScope = function(cb) {
	cb(null, this.message_props.key + " " + this.user.id + " " + this.message.raw);
}

exports.word = function(word1, word2, cb) {
	cb(null, word1 === word2);	
}

exports.hasFirstName = function(bool, cb) {
  this.user.getVar('firstName', function(e,name){
    if (name != null) {
      cb(null, (bool == "true") ? true : false)
    } else {
      cb(null, (bool == "false") ? true : false)
    }
  });
}

exports.getUserId = function(cb) {
  var userID = this.user.id;
  var that = this;
  // console.log("CMP1", _.isEqual(userID, that.user.id));
  return that.bot.getUser("userB", function(err, user) {
    console.log("CMP2", _.isEqual(userID, that.user.id));
    cb(null, that.user.id);
  });
}

