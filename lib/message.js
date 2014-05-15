var pos 		= require("pos");
var _ 			= require("underscore");
var debug 	= require("debug")("Message");

function Message(msg, qtypes, norm) {
	debug("Creating message from:", msg);

	if (!msg) return;

	var that = this;
	that.raw = msg;
	that.clean = norm.clean(msg);

	if (that.clean != that.raw) {
		debug("DIFF", "'" + that.clean +"', '" + that.raw + "'");
	}

  that.words = new pos.Lexer().lex(that.clean);
  that.taggedWords = new pos.Tagger().tag(that.words);
  that.posString = (_.map(that.taggedWords, function(item, key){ return item[1]; })).join(" ");
  that.qtype = qtypes.classify(that.clean);
}

module.exports = Message;
