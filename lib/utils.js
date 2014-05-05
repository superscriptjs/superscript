var debug = require("debug")("Utils");

// Strip whitespace from a string.
exports.trim = function (text) {
	var before = text;
	text = text.replace(/^[\s\t]+/i, "");
	text = text.replace(/[\s\t]+$/i, "");
	text = text.replace(/[\x0D\x0A]+/i, "");
	text = text.replace(/\s{2,}/g, ' ');

	if (before != text) debug("Trim", text);
	return text;
};

// Count real words in a string.
exports.wordCount = function (trigger) {
	var words = [];
	words = trigger.split(/[\s\*\#\_\|]+/);

	var wc = 0;
	for (var i = 0, end = words.length; i < end; i++) {
		if (words[i].length > 0) {
			wc++;
		}
	}

	return wc;
};

// Escape a string for a regexp.
exports.quotemeta = function (string) {
	var unsafe = "\\.+*?[^]$(){}=!<>|:";
	for (var i = 0; i < unsafe.length; i++) {
		string = string.replace(new RegExp("\\" + unsafe.charAt(i), "g"), "\\" + unsafe.charAt(i));
	}
	return string;
};

