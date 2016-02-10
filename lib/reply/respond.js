var processHelpers = require("./common");
var Message = require("../message");
var Utils = require("../utils");
var async = require("async");
var debug = require("debug-levels")("SS:Reply:Respond");

var RESPOND_REGEX = /\^respond\(\s*([\w~]*)\s*\)/;
module.exports = function(reply, respondMatch, options, callback) {

  return async.whilst(
    function () {
      return respondMatch;
    },
    function (cb) {
      var getreply = require("../getreply");
      var newTopic = Utils.trim(respondMatch[1]);
      debug.verbose("Topic Check with new Topic: " + newTopic);

      processHelpers.getTopic(options.system.topicsSystem, newTopic, function (err, topicData) {

        options.aTopics = [];
        options.message = options.localOptions.message;
        options.aTopics.push(topicData);

        getreply(options, function (err, subreply) {
          if (err) {
            console.log(err);
          }

          // The topic is not set correctly in getReply!
          debug.verbose("CallBack from respond topic (getReplyObj)", subreply);


          if (subreply && subreply.replyId) {
            debug.verbose("subreply", subreply);
            // We need to do a lookup on subreply.replyId and flash the entire reply.
            options.system.topicsSystem.reply.findById(subreply.replyId)
              .exec(function (err, fullReply) {
              if (err) {
                debug.error(err);
              }

              debug.verbose("fullReply", fullReply);

              debug.verbose("Setting the topic to the matched one");
              options.user.setTopic(newTopic);

              reply = fullReply.reply || "";
              replyObj = subreply;
              replyObj.reply = fullReply;
              replyObj.topicName = newTopic;
              respondMatch = reply.match(RESPOND_REGEX);

              cb((options.depth === 50) ? "Depth Error" : null);

            });
          } else {
            respondMatch = false;
            reply = "";
            replyObj = {};

            cb((options.depth === 50) ? "Depth Error" : null);
          }
        });
      });
    },
    function (err) {
      debug.verbose("CallBack from Respond Function", replyObj );
      return callback(err, Utils.trim(reply), options.localOptions.message.props, replyObj);
    }
  );
};
