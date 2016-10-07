var Message = require("../message");
var Utils = require("../utils");
var processHelpers = require("./common");
var async = require("async");
var debug = require("debug-levels")("SS:Reply:inline");

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
      debug.verbose("Inline redirection to: '%s'", target)

      // if we have a special topic, reset it to the previous one
      // in order to preserve the context for inline redirection
      if (options.topic === "__pre__" || options.topic === "__post__") {
        if (options.user.__history__.topic.length) {
          options.topic = options.user.__history__.topic[0];
        }
      }

      processHelpers.getTopic(options.system.topicsSystem, options.topic, function (err, topicData) {
        options.aTopics = [];
        options.aTopics.push(topicData);
        options.system.messageScope = options.localOptions.messageScope;

        new Message(target, messageOptions, function (replyMessageObject) {
          options.message = replyMessageObject;
          debug.verbose("replyMessageObject", replyMessageObject);

          var getreply = require("../getreply");
          getreply(options, function (err, subreply) {
            if (err) {
              console.log(err);
            }

            debug.verbose("subreply", subreply);

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
      debug.verbose("CallBack from inline redirect", Utils.trim(reply));
      return callback(err, Utils.trim(reply), options.localOptions.message.props, {});
    }
  );
};
