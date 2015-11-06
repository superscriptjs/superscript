var Message = require("../message");
var Utils = require("../utils");
var processHelpers = require("./helpers");
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

          debug("CallBack from respond topic", subreply);

          if (subreply) {
            reply = subreply.string || "";
            replyObj = subreply;
            respondMatch = reply.match(/\^respond\(\s*([\w~]*)\s*\)/);
          } else {
            respondMatch = false;
            reply = "";
            replyObj = {};
          }

          if (options.depth === 50) {
            cb("Depth Error");
          } else {
            cb(null);
          }
        });
      });
    },
    function (err) {
      if (err) {
        return callback(err, "", options.system.scope.message.props, replyObj);
      } else {
        debug("CallBack from Respond Function", reply);
        // TODO Custom function check
        return callback(null, reply, options.system.scope.message.props, replyObj);
      }
    }
  );
};
