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

  autoReply(message, user, facts, cnet, function(err, reply) {
    if (!user.suggestedReply && reply != null) {
      user.suggestedReply = reply;
    }

    self.check(message, user, facts, cnet, function(err, reply) {
      if (reply != null) {
        if (!user.suggestedReply) {
          user.suggestedReply = reply;
        } else {
          debug("Concat", user.suggestedReply, "and",  reply)
          user.suggestedReply = user.suggestedReply + " " + reply;  
        }
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