var async = require("async");
var _ = require("underscore");
var debug = require("debug")("GetReply");
var dWarn = require("debug")("GetReply:Warning");
var Utils = require("./utils");
var processTags = require("./processtags");

var topicSystem;
var gPlugins;
var gScope;
var gDepth;
var gQtypes;
var gNormalize;
var gFacts;
var gEditMode;

// Topic iterator, we call this on each topic or conversation reply looking for a match.
// All the matches are stored and returned in the callback.
var topicItorHandle = function (topSystem, message, user) {
  return function (topicData, callback) {
    if (topicData.type === "TOPIC") {
      topSystem.topic.findOne({_id: topicData.id})
        .populate("gambits")
        .exec(function (err, topic) {
          if (err) {
            console.log(err);
          }
          if (topic) {
            // We do realtime post processing on the input aginst the user object
            topic.findMatch(message, user, gPlugins, gScope, callback);
          } else {
            // We call back if there is no topic Object
            // Non-existant topics return false
            callback(null, false);
          }
        }
      );
    } else if (topicData.type === "REPLY") {
      topSystem.reply.findOne({_id: topicData.id})
        .populate("gambits")
        .exec(function (err, reply) {
          if (err) {
            console.log(err);
          }
          debug("Conversation Reply Thread", reply);
          if (reply) {
            reply.findMatch(message, user, gPlugins, gScope, callback);
          } else {
            callback(null, false);
          }
        }
      );
    } else {
      debug("We shouldn't hit this");
      callback(null, false);
    }
  };
};

var afterHandle = function (user, callback) {
  // Note, the first arg is the Reply (normally the error);
  // We are breaking the matchItorHandle flow on data stream.
  return function (reply) {
    callback(null, reply);
  };
};

// This may be called several times, once for each topic.
var filterRepliesBySeen = function (filteredResults, user, callback) {
  debug("filterRepliesBySeen", filteredResults);
  var bucket = [];
  var eachResultItor = function (filteredResult, next) {

    var topicName = filteredResult.topic;
    topicSystem.topic.findOne({name: topicName }).exec(function (err, currentTopic) {
      if (err) {
        console.log(err);
      }

      var repIndex = filteredResult.id;
      var reply = filteredResult.reply;
      var inputId = filteredResult.trigger_id2;
      var seenReply = false;

      // Filter out SPOKEN replies.
      // If something is said on a different trigger we don't remove it.
      // If the trigger is very open ie "*", you should consider putting a {keep} flag on it.

      for (var i = 0; i <= 10; i++) {
        var topicItem = user.__history__.topic[i];
        if (topicItem !== undefined) {

          var pastGambit = user.__history__.reply[i];
          var pastInput = user.__history__.input[i];

          // Sometimes the history has null messages because we spoke first.
          if (!_.isNull(pastGambit) && !_.isNull(pastInput)) {
            // Do they match and not have a keep flag

            debug("--------------- FILTER SEEN ----------------");
            debug("repIndex", repIndex);
            debug("pastGambit.replyId", pastGambit.replyId);
            debug("pastInput id", String(pastInput.gambitId));
            debug("current inputId", String(inputId));
            debug("reply.keep", reply.keep);
            debug("currentTopic.keep", currentTopic.keep);


            if (repIndex === pastGambit.replyId &&
              // TODO, For conversation threads this should be disbled becasue we are looking
              // the wrong way.
              // But for forward theads it should be enabled.
              // String(pastInput.gambitId) === String(inputId) &&
              reply.keep === false &&
              currentTopic.keep === false
            ) {
              debug("Already Seen", reply);
              seenReply = true;
            }
          }
        }
      }

      if (!seenReply || gEditMode) {
        bucket.push(filteredResult);
      }
      next();
    });
  };

  async.each(filteredResults, eachResultItor, function eachResultCompleteHandle() {
    debug("Bucket", bucket);
    if (!_.isEmpty(bucket)) {
      callback(null, Utils.pickItem(bucket));
    } else {
      callback(true);
    }
  });
}; // end filterBySeen

var filterRepliesByFunction = function (replies, user, callback) {
  var filterRegex = /\^(\w+)\(([\w<>,\s]*)\)/i;
  var filterHandle = function (reply, cb) {

    // We support a single filter function in the reply
    // It returns true/false to aid in the selection.

    if (reply.reply.filter !== "") {
      debug("Filter Function Found");
      var filterFunction = reply.reply.filter.match(filterRegex);
      var pluginName = Utils.trim(filterFunction[1]);
      var partsStr = Utils.trim(filterFunction[2]);
      var parts = partsStr.split(",");
      var args = [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i] !== "") {
          args.push(parts[i].trim());
        }
      }

      if (gPlugins[pluginName]) {
        args.push(function customFilterFunctionHandle(err, filterReply) {
          if (err) {
            console.log(err);
          }

          if (filterReply === "true" || filterReply === true) {
            cb(true);
          } else {
            cb(false);
          }
        });

        debug("Calling Plugin Function", pluginName);
        gPlugins[pluginName].apply(gScope, args);

      } else {
        // If a function is missing, we kill the line and return empty handed
        // Lets remove it and try to carry on.
        dWarn("Custom Filter Function not-found", pluginName);
        reply = Utils.trim(reply.replace(filterFunction[0], ""));
        cb(true);
      }
    } else {
      cb(true);
    }
  };

  async.filter(replies, filterHandle, function (filteredReplies) {
    debug("filterByFunction Results", filteredReplies);
    filterRepliesBySeen(filteredReplies, user, function afterFilterRepliesBySeen(err, reply) {
      if (err) {
        console.log(err);
        // Keep looking for results
        callback();
      } else {

        var options = {
          plugins: gPlugins,
          scope: gScope,
          topicSystem: topicSystem,
          depth: gDepth,

          // For creating new Messages
          qtypes: gQtypes,
          normalize: gNormalize,
          facts: gFacts
        };

        // TODO - ReplyObj and processedReplyString are from the same source. Standardize on one?
        processTags(reply, user, options, function (err2, processedReplyString, props, replyObj) {

          if (processedReplyString === "") {
            callback();
          } else if (replyObj) {
            callback({
              id: replyObj.id,
              replyId: replyObj.replyId,
              string: replyObj.string,
              props: props,
              gambitId: replyObj.gambitId,
              topicName: replyObj.topicName
            }, null);
          } else {
            callback({
              id: reply.id,
              replyId: reply.reply._id,
              string: processedReplyString,
              props: props,
              gambitId: reply.trigger_id2,
              topicName: reply.topic
            }, null);
          }
        });
      }
    });
  });
};

// match is an array
var matchItorHandle = function (user, message) {
  return function (match, callback) {
    debug("match itor", match.trigger);
    var replies = [];
    var rootTopic;
    var stars = match.stars;

    if (!_.isEmpty(message.stars)) {
      stars = message.stars;
    }

    // In some edge cases, replies were not being populated...
    // lets do it here
    topicSystem.gambit.findById(match.trigger._id)
      .populate("replies")
      .exec(function (err, triggerExpanded) {
        if (err) {
          console.log(err);
        }

        match.trigger = triggerExpanded;

        match.trigger.getRootTopic(function (err, topic) {
          if (err) {
            console.log(err);
          }

          if (match.topic) {
            rootTopic = match.topic;
          } else {
            rootTopic = topic;
          }

          for (var i = 0; i < match.trigger.replies.length; i++) {
            var rep = match.trigger.replies[i];
            var mdata = {
              id: rep.id,
              stars: stars,
              topic: rootTopic,
              reply: rep,
              trigger_id: match.trigger.id,
              // we want to move to using mongo ids
              trigger_id2: match.trigger._id
            };
            replies.push(mdata);
          }

          // Find a reply for the match.
          filterRepliesByFunction(replies, user, callback);

        });
      }
    );
  };
};

var getreply = function (options, callback) {
  var user = options.user;
  var message = options.message;
  // var aTopics = [];

  gPlugins = options.system.plugins;
  gScope = options.system.scope;
  gDepth = options.depth || 0;

  gQtypes = options.system.question;
  gNormalize = options.system.normalize;
  gFacts = options.system.facts;
  gEditMode = options.system.editMode || false;

  // We want to make the message and user available to plugins.
  gScope.message = message;
  gScope.user = user;

  // New TopicSystem
  topicSystem = options.system.topicsSystem;

  // This method can be called recursively.
  if (options.depth) {
    debug("Called Recursively", gDepth);
    if (gDepth >= 50) {
      return callback(null, null);
    }
  }
  // Find Topics for User or override with passed in option
  topicSystem.topic.findPendingTopicsForUser(user, message, function (err, aTopics) {
    if (err) {
      console.log(err);
    }

    // Flash topics with pre-set list
    aTopics = !_.isEmpty(options.aTopics) ? options.aTopics : aTopics;

    debug("Topics to check", aTopics);

    // We use map here because it will bail on error.
    // The error is our escape hatch when we have a reply WITH data.
    async.mapSeries(
      aTopics,
      topicItorHandle(topicSystem, message, user),
      function topicCompleteHandle(err2, results) {
        if (err2) {
          console.log(err2);
        }

        // Remove the empty topics, and flatten the array down.
        var matches = _.flatten(_.filter(results, function (e) {
          return e;
        }));
        async.eachSeries(matches, matchItorHandle(user, message), afterHandle(user, callback));
      }
    );
  });
};

module.exports = getreply;
