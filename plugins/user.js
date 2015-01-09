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