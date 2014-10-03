exports.save = function(key, value, cb) {
	this.user.set(key, value)
	cb(null, "");
}
