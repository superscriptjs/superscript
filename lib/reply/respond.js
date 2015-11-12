var processHelpers = require("./common");
var Message = require("../message");
var Utils = require("../utils");
var async = require("async");
var debug = require("debug")("Reply:Respond");

module.exports = function(reply, respondMatch, options, callback) {

  return async.whilst(
    function () {
      return respondMatch;
    },
    function (cb) {
      var getreply = require("../getreply");
      var newTopic = Utils.trim(respondMatch[1]);
      debug("Topic Check with new Topic: " + newTopic);

      processHelpers.getTopic(options.system.topicsSystem, newTopic, function (err, topicData) {

        options.aTopics = [];
        options.message = options.system.scope.message;
        options.aTopics.push(topicData);

        getreply(options, function (err, subreply) {
          if (err) {
            console.log(err);
          }

          debug("CallBack from respond topic (getReplyObj)", subreply);

          if (subreply) {
            // We need to do a lookup on subreply.replyId and flash the entire reply.
            options.system.topicsSystem.reply.findById(subreply.replyId)
              .exec(function (err, fullReply) {
              if (err) {
                console.log(err);
              }

              reply = fullReply.reply || "";
              replyObj = subreply;
              replyObj.reply = fullReply;
              respondMatch = reply.match(/\^respond\(\s*([\w~]*)\s*\)/);

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
      debug("CallBack from Respond Function", replyObj );
      return callback(err, Utils.trim(reply), options.system.scope.message.props, replyObj);
    }
  );
};
