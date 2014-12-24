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

exports.hasName = function(bool, cb) {
	this.user.get('name', function(e,name){
		if (name !== null) {
			cb(null, (bool == "true") ? true : false)
		} else {
			// We have no name
			cb(null, (bool == "false") ? true : false)
		}
	});
}