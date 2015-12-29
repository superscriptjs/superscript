
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