var Message = require("../message");
var Utils = require("../utils");
var processHelpers = require("./common");
var async = require("async");
var debug = require("debug")("Reply:inline");

module.exports = function(reply, redirectMatch, options, callback) {
  
  var messageOptions = {
    qtypes: options.system.question,
    norm: options.system.normalize,
    facts: options.system.facts
  };

  return async.whilst(
    function () {
      return redirectMatch;
    },
    function (cb) {
      
      var target = redirectMatch[1];
      debug("Inline redirection to: '" + target + "'");

      processHelpers.getTopic(options.system.topicsSystem, options.topic, function (err, topicData) {
        options.aTopics = [];
        options.aTopics.push(topicData);

        new Message(target, messageOptions, function (replyMessageObject) {
          options.message = replyMessageObject;
          debug("replyMessageObject", replyMessageObject);

          var getreply = require("../getreply");
          getreply(options, function (err, subreply) {
            if (err) {
              console.log(err);
            }

            debug("subreply", subreply);

            if (subreply) {
              var rd1 = new RegExp("\\{@" + Utils.quotemeta(target) + "\\}", "i");
              reply = reply.replace(rd1, subreply.string);
              redirectMatch = reply.match(/\{@(.+?)\}/);
            } else {
              redirectMatch = false;
              reply = reply.replace(new RegExp("\\{@" + Utils.quotemeta(target) + "\\}", "i"), "");
            }

            cb((options.depth === 50) ? "Depth Error" : null);
            
          }); // getReply
        }); // Message
      });
    },
    function (err) {
      debug("CallBack from inline redirect", Utils.trim(reply));
      return callback(err, Utils.trim(reply), options.system.scope.message.props, {});
    }
  );
};
