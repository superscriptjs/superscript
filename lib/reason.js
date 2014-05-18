var math 		= require("./math");

var debug 	= require("debug")("ReasonSystem");
var dWarn 	= require("debug")("ReasonSystem:Warning");

exports.internalizeMessage = function(message, user, callback) {
	debug("Thinking about how to answer", message.clean);
	// Lets add the math module here to test this out.
	if (message.numericExp) {
		math.parse(message);
	}

	// TODO - Add Pre-Hook Plugins here
	callback(null, null)
}
