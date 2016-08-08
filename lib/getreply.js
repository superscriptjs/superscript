var async = require("async");
var _ = require("lodash");
var debug = require("debug-levels")("SS:GetReply");
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
var topicItorHandle = function (topSystem, message, user, localOptions) {

  return function (topicData, callback) {
    if (topicData.type === "TOPIC") {
      topSystem.topic.findOne({_id: topicData.id})
        .populate("gambits")
        .populate("conditions")
        .exec(function (err, topic) {
          topic.checkConditions(message, user, gPlugins, gScope, localOptions, function(err, matches) {
            debug.verbose("Checking for conditions in " + topic.name);

            if (!_.isEmpty(matches)) {
              callback(err, matches);
            } else {
              if (topic) {
                user.clearConversationState(function() {
                  debug.verbose("Topic findMatch " + topic.name);
                  // We do realtime post processing on the input aginst the user object
                  topic.findMatch(message, user, gPlugins, gScope, localOptions, callback);                  
                });
              } else {
                // We call back if there is no topic Object
                // Non-existant topics return false
                callback(null, false);
              }
            }
          });
        }
      );
    } else if (topicData.type === "REPLY") {
      topSystem.reply.findOne({_id: topicData.id})
        .populate("gambits")
        .exec(function (err, reply) {
          if (err) {
            console.log(err);
          }
          debug.verbose("Conversation Reply Thread", reply);
          if (reply) {
            reply.findMatch(message, user, gPlugins, gScope, localOptions, callback);
          } else {
            callback(null, false);
          }
        }
      );
    } else {
      debug.verbose("We shouldn't hit this");
      callback(null, false);
    }
  };
};

var afterHandle = function (user, callback) {
  // Note, the first arg is the ReplyBit (normally the error);
  // We are breaking the matchItorHandle flow on data stream.
  return function (replyBit, matchSet) {
    
    debug.verbose("MatchSet", replyBit,  matchSet);

    // remove empties
    matchSet = _.compact(matchSet);

    var minMatchSet = [];
    var props = {};
    var clearConvo = false;
    var lastTopicToMatch = null;
    var lastStarSet = null;
    var lastReplyId = null;
    var replyString = "";
    var lastSubReplies = null;
    var lastBreakBit = null;

    for (var i = 0; i < matchSet.length; i++) {
      var item = matchSet[i];
      var mmm = {
        topic: item.matched_topic_string || item.topic,
        input: item.trigger,
        reply: item.matched_reply_string,
      };

      if (!_.isEmpty(item.minMatchSet)) {
        mmm.subset = item.minMatchSet;
      } else {
        mmm.output = item.reply.reply;
      }

      minMatchSet.push(mmm);

      
      if (item && item.reply) {
        replyString += item.reply.reply + " ";
      }
      
      props = _.assign(props, item.props);
      lastTopicToMatch = item.topic;
      lastStarSet = item.stars;
      lastReplyId = item.reply._id;
      lastSubReplies = item.subReplies;
      lastBreakBit = item.breakBit;

      if (item.clearConvo) {
        clearConvo = item.clearConvo;
      }
    }

    var threadsArr = [];
    if (_.isEmpty(lastSubReplies)) {
      threadsArr = processTags.threads(replyString);
    } else {
      threadsArr[0] = replyString;
      threadsArr[1] = lastSubReplies;
    }
      
    var replyStr = threadsArr[0];
    // Remove one trailing space from the end, if it is a space, and one leading.
    // We don't just want to trim here because spaces may have been added deliberately.
    if (replyStr.slice(-1) === " ") {
      replyStr = replyStr.substr(0, replyStr.length - 1);
    }
    if (replyStr[0] === " ") {
      replyStr = replyStr.replace(/^\s+/,'');
    }
    
    var cbdata = {
      replyId: lastReplyId,
      props: props,
      clearConvo: clearConvo,
      topicName: lastTopicToMatch,
      minMatchSet: minMatchSet,
      string: replyStr,
      subReplies: threadsArr[1],
      stars: lastStarSet,
      breakBit: lastBreakBit
    };

    debug.verbose("afterHandle", cbdata);
    
    callback(null, cbdata);
  };
};

// This may be called several times, once for each topic.
var filterRepliesBySeen = function (filteredResults, user, callback) {
  debug.verbose("filterRepliesBySeen", filteredResults);
  var bucket = [];
  var eachResultItor = function (filteredResult, next) {

    var topicName = filteredResult.topic;
    topicSystem.topic.findOne({name: topicName }).exec(function (err, currentTopic) {
      if (err) {
        console.log(err);
      }

      // var repIndex = filteredResult.id;
      var repIndex = filteredResult.reply._id;
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

            debug.verbose("--------------- FILTER SEEN ----------------");
            debug.verbose("repIndex", repIndex);
            debug.verbose("pastGambit.replyId", pastGambit.replyId);
            debug.verbose("pastInput id", String(pastInput.gambitId));
            debug.verbose("current inputId", String(inputId));
            debug.verbose("reply.keep", reply.keep);
            debug.verbose("currentTopic.keep", currentTopic.keep);

            if (String(repIndex) === String(pastGambit.replyId) &&
              // TODO, For conversation threads this should be disbled becasue we are looking
              // the wrong way.
              // But for forward theads it should be enabled.
              // String(pastInput.gambitId) === String(inputId) &&
              reply.keep === false &&
              currentTopic.keep === false
            ) {
              debug.verbose("Already Seen", reply);
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
    debug.verbose("Bucket", bucket);
    if (!_.isEmpty(bucket)) {
      callback(null, Utils.pickItem(bucket));
    } else {
      callback(true);
    }
  });
}; // end filterBySeen

var filterRepliesByFunction = function (replies, user, opt, callback) {
  
  var filterRegex = /\^(\w+)\(([\w<>,\s]*)\)/i;
  var filterHandle = function (reply, cb) {

    // We support a single filter function in the reply
    // It returns true/false to aid in the selection.
    if (reply.reply.filter !== "") {
      debug.verbose("Filter Function Found");

      var stars = [""];
      stars.push.apply(stars, reply.stars);

      var filterFunction = reply.reply.filter.match(filterRegex);
      var pluginName = Utils.trim(filterFunction[1]);
      var partsStr = Utils.trim(filterFunction[2]);
      var parts = partsStr.split(",");
      var args = [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i] !== "") {
          var part1 = parts[i].replace(/<cap>/ig, stars[1]);
          for (var n = 1; n <= stars.length; n++) {
            part1 = part1.replace(new RegExp("<cap" + n + ">", "ig"), Utils.encodeCommas(stars[n]));
          }

          args.push(part1.trim());
        }
      }

      if (gPlugins[pluginName]) {

        var filterScope = gScope;
        filterScope.message = opt.message;
        filterScope.user = opt.user;
        filterScope.message_props = opt.messageScope;
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

        debug.verbose("Calling Plugin Function", pluginName);
        gPlugins[pluginName].apply(filterScope, args);

      } else {
        // If a function is missing, we kill the line and return empty handed
        // Lets remove it and try to carry on.
        console.log("\nWARNING:\nYou have a missing filter function (" + pluginName + ") - your script will not behave as expected!");
        // Wow, worst variable name ever - sorry.
        reply = Utils.trim(reply.reply.reply.replace(filterFunction[0], ""));
        cb(true);
      }
    } else {
      cb(true);
    }
  };

  async.filter(replies, filterHandle, function (filteredReplies) {
    debug.verbose("filterByFunction Results", filteredReplies);
    filterRepliesBySeen(filteredReplies, user, function afterFilterRepliesBySeen(err, reply) {
      if (err) {
        debug.error(err);
        // Keep looking for results
        callback();
      } else {

        var options = {
          plugins: gPlugins,
          scope: gScope,
          topicSystem: topicSystem,
          depth: gDepth,

          // Some options are global, these are local!
          localOptions: opt,

          // For creating new Messages
          qtypes: gQtypes,
          normalize: gNormalize,
          facts: gFacts
        };

        var replyString = reply.reply.reply;
        var topicString = reply.topic;

        processTags.replies(reply, user, options, function (err2, replyObj) {
          if (!_.isEmpty(replyObj)) {

            replyObj.matched_reply_string = replyString;
            replyObj.matched_topic_string = topicString;

            debug.verbose("ProcessTags Return", replyObj);

            if (replyObj.breakBit === false) {
              debug.info("Forcing CHECK MORE Mbit");
              callback(null, replyObj);
            } else if (replyObj.breakBit === true || replyObj.reply.reply !== "" ) {
              callback(true, replyObj);
            } else {
              debug.info("Forcing CHECK MORE Empty Reply");
              callback(null, replyObj);
            }
          } else {
            debug.verbose("ProcessTags Empty");
            if (err2) {
               debug.verbose("There was an err in processTags", err2);
            }
            callback(null, null);
          }
        });
      }
    });
  });
};

// match is an array
var matchItorHandle = function (user, message, localOptions) {

  return function (match, callback) {
    debug.verbose("match itor", match.trigger);
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

              // For the logs
              trigger: match.trigger.input, 

              trigger_id: match.trigger.id,
              trigger_id2: match.trigger._id
            };
            replies.push(mdata);
          }

          // Find a reply for the match.
          filterRepliesByFunction(replies, user, localOptions, callback);

        });
      }
    );
  };
};


var getreply = function (options, callback) {
  var user = options.user;
  var message = options.message;

  message.messageScope = options.system.messageScope || {};

  gPlugins = options.system.plugins;
  gScope = options.system.scope;
  gDepth = options.depth || 0;

  gQtypes = options.system.question;
  gNormalize = options.system.normalize;
  gFacts = options.system.facts;
  gEditMode = options.system.editMode || false;

  var localOptions = {
    message: message,
    user: user,
    messageScope: options.system.messageScope || {}
  };

  // New TopicSystem
  topicSystem = options.system.topicsSystem;

  // This method can be called recursively.
  if (options.depth) {
    debug.verbose("Called Recursively", gDepth);
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
    if (!_.isEmpty(options.aTopics)) {
      debug.verbose("Flashed topics (directReply, respond or topicRedirect)");
    }

    aTopics = !_.isEmpty(options.aTopics) ? options.aTopics : aTopics;
    debug.info("Topics to check", aTopics.map(function(x) { return x.name }));

    // We use map here because it will bail on error.
    // The error is our escape hatch when we have a reply WITH data.
    async.mapSeries(
      aTopics,
      topicItorHandle(topicSystem, message, user, localOptions),
      function topicCompleteHandle(err2, results) {
        if (err2) {
          console.log(err2);
        }

        // Remove the empty topics, and flatten the array down.
        var matches = _.flatten(_.filter(results, function (e) {
          return e;
        }));
        
        // TODO - This sort should happen in the process sort logic.
        // Lets sort the matches by qType.length
        matches = matches.sort(function(a, b) {
          return a.trigger.qType.length < b.trigger.qType.length;
        });
        
        // sort by disorderedWeight
        matches = matches.sort(function(a, b) {
          return a.disorderedWeight < b.disorderedWeight;
        });

        // sort by stars
        matches = matches.sort(function(a, b) {
          return a.stars.length > b.stars.length;
        }); 

        matches = matches;

        // Was `eachSeries` 
        async.mapSeries(matches, matchItorHandle(user, message, localOptions), afterHandle(user, callback));
      }
    );
  });
};

module.exports = getreply;
