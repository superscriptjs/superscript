var math 		= require("./math");

var debug 	= require("debug")("ReasonSystem");
var dWarn 	= require("debug")("ReasonSystem:Warning");

// Here is where we think about what to say, and if there is no match 
// we may say it.
exports.internalizeMessage = function(message, user, callback) {
	debug("Thinking about how to answer", message.clean);
	
	
	if (message.numericExp) {
		var answer = math.parse(message.words);
		if (answer) {
			user.suggestedReply = "I think it is " + answer;	
		} else {
			user.suggestedReply =  "What do I look like, a computer?";	
		}
	}


	// TODO - Add Pre-Hook Plugins here
	callback(null, null)
}
