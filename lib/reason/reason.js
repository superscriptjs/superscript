var math      = require("../math");
var compare   = require("./compare");
var autoReply = require("./autoreply");
var self      = require("./self");
var _         = require("underscore");


var debug   = require("debug")("ReasonSystem");
var dWarn   = require("debug")("ReasonSystem:Warning");

// Here is where we think about what to say, and if there is no match 
// we may say it.
exports.internalizeMessage = function(message, user, facts, cnet, callback) {
  debug("Thinking about how to answer", message.clean);
  
  // Evaluate the expression if it is mathmatical
  if (message.numericExp || (message.halfNumericExp && user.prevAns)) {
    var answer = math.parse(message.cwords, user.prevAns);
    if (answer) {
      user.prevAns = answer;
      user.suggestedReply = "I think it is " + answer;
    } else {
      user.suggestedReply =  "What do I look like, a computer?";
    }
  }

  autoReply(message, user, facts, cnet, function(err, reply) {
    if (!user.suggestedReply && reply != null) {
      user.suggestedReply = reply;
    }

    self(message, user, facts, cnet, function(err, reply) {

      if (reply != null) {
        user.suggestedReply = reply;
      }

      compare(message, user, facts, function(err, reply) {

        if (reply != null) {
          debug("Compare Reply", reply)
          user.suggestedReply = reply;
        }
        // TODO - Add Pre-Hook Plugins here
        callback(null, null);   
      });
    });
  });

}