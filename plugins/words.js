var pluralize = require("pluralize");
var debug = require("debug")("Word Plugin");
var utils = require("../lib/utils");

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

exports.not = function(word, cb) {
  var words = word.split("|");
  var results = utils.inArray(this.message.words, words);
  debug("RES", results);
  cb(null, (results === false));
}

exports.lowercase = function(word, cb) {
  if (word) {
    cb(null, word.toLowerCase());  
  } else {
    cb(null, "");
  }
  
}