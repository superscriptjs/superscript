var async = require("async");
var Message = require("../message");
var Utils = require("../utils");
var processHelpers = require("./helpers");
var debug = require("debug")("Reply:topicRedirect");

module.exports = function(reply, stars, redirectMatch, options, callback) {

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
      var main = Utils.trim(redirectMatch[0]);
      var topic = Utils.trim(redirectMatch[1]);
      var target = Utils.trim(redirectMatch[2]);
      var getreply = require("../getreply");

      debug("Topic Redirection to: " + target + " topic: " + topic);
      options.user.setTopic(topic);

      // Here we are looking for gambits in the NEW topic.
      processHelpers.getTopic(options.system.topicsSystem, topic, function (err, topicData) {
        if (err) {
          /*
            In this case the topic does not exist, we want to just pretend it wasn't
            provided and reply with whatever else is there.
           */
          redirectMatch = reply.match(/\^topicRedirect\(\s*([~\w<>\s]*),([~\w<>\s]*)\s*\)/);
          reply = Utils.trim(reply.replace(main, ""));
          debug("Invalid Topic", reply);
          return cb(null);
        }

        options.aTopics = [];
        options.aTopics.push(topicData);

        new Message(target, messageOptions, function (replyMessageObject) {
          options.message = replyMessageObject;

          // Pass the stars (captured wildcards) forward
          options.message.stars = stars.slice(1);

          getreply(options, function (err, subreply) {
            if (err) {
              cb(null);
            }

            if (subreply) {
              debug("CallBack from inline redirect", subreply);
              reply = reply.replace(main, subreply.string);
              replyObj = subreply;
              redirectMatch = reply.match(/\^topicRedirect\(\s*([~\w<>\s]*),([~\w<>\s]*)\s*\)/);
            } else {
              redirectMatch = false;
              reply = reply.replace(main, "");
              replyObj = {};
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
        return callback(err, "");
      } else {
        // TODO - Custom function check?
        debug("CallBack from inline redirect", reply, replyObj);
        return callback(null, reply, options.system.scope.message.props, replyObj);
      }
    }
  );
};
