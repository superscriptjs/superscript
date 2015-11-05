var Message = require("../message");
var Utils = require("../utils");
var processHelpers = require("./helpers");
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

            if (options.depth === 50) {
              cb("Depth Error");
            } else {
              cb(null);
            }
          }); // getReply
        }); // Message
      });
    },
    function (err) {
      if (err) {
        return callback(err, "", options.system.scope.message.props);
      } else {
        debug("CallBack from inline redirect", Utils.trim(reply));
        processHelpers.parseCustomFunctions(reply, options.system.plugins, options.system.scope, function (err2, newReply) {
          if (err2) {
            console.log(err2);
          }
          return callback(null, Utils.trim(newReply), options.system.scope.message.props);
        });
      }
    }
  );
};
