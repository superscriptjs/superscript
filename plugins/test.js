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