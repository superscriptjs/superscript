var pluralize = require("pluralize");

exports.plural = function(word, cb) {
	// Sometimes WordNet will give us more then one word
	var parts, reply;
	parts = word.split(" ");

	if (parts.length == 2) {
		reply = pluralize.plural(parts[0]) + " " + parts[1];
	} else {
		reply = pluralize.plural(word);
	}

	cb(null, reply);
}
