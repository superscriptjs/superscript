var debug 	= require("debug")("ReasonSystem");
var dWarn 	= require("debug")("ReasonSystem:Warning");


exports.internalizeMessage = function(message, user, callback) {
	debug("Thinking about how to answer", message.clean);
	// TODO - Add Pre-Hook Plugins here
	callback(null, null)
}
