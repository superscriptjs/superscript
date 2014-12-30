var async = require("async");
var _ = require("underscore");
var debug = require("debug")("GetReply");
var dWarn = require("debug")("GetReply:Warning");
var Utils = require("./utils");
var processTags = require("./processtags");

var topicSystem;
var gPlugins;
var gScope;

var getreply = function(options, callback) {
  var user = options.user;
  var message = options.message;
  var step = options.step;

  gPlugins = options.system.plugins;
  gScope = options.system.scope;

  // We want to make the message and user available to plugins.
  gScope.message = message;
  gScope.user = user;

  // New TopicSystem
  topicSystem = options.system.topicsSystem;

  // Find Topics for User
  var aTopics = topicSystem.findPendingTopicsForUser(user);

  // We use map here because it will bail on error.
  // The error is our escape hatch when we have a reply WITH data.
  async.mapSeries(
    aTopics, 
    topicItorHandle(topicSystem, message, user), 
    function topicCompleteHandle(err, results){
      // Remove the empty topics, and flatten the array down.
      var matches = _.flatten(_.filter(results, function(e){return e}));
      async.eachSeries(matches, matchItorHandle(user), afterHandle(user, callback));
    }
  );
}

var afterHandle = function(user, callback){
  // Note, the first arg is the Reply (normally the error);
  // We are breaking the matchItorHandle flow on data stream.
  return function(reply, err) {
    callback(null, reply);
  }
}

// Topic iterator, we call this on each topic looking for a match.
// All the matches are stored and returned in the callback.
var topicItorHandle = function(topicSystem, message, user) {

  return function(topicName, callback) {
    var topic = topicSystem.findTopicByName(topicName);
    if (topic) {
      // We do realtime post processing on the input aginst the user object
      topic.findMatch(message, user, callback);
    } else {
      // We call back if there is no topic Object 
      // Non-existant topics retutn false
      callback(null, false);
    }
  }
}

// match is an array 
var matchItorHandle = function(user) {
  return function(match, callback) {
    var replies = [];
  
    debug("match itor", match);

    for (var repIndex in match.trigger.replies) {
      var rep = match.trigger.replies[repIndex];
      
      var mdata = {
        crc:repIndex, 
        stars:match.stars, 
        topic: match.topic,
        reply:rep, 
        trigger_id: match.trigger.id
      };
      replies.push(mdata);
    }

    // Find a reply for the match.
    filterRepliesByFunction(replies, user, callback);
  }
}

// This may be called several times, once for each topic.
var filterRepliesBySeen = function(filteredResults, user, callback) {
  var bucket = [];
  var keepRegex = new RegExp("\{keep\}", "i");

  debug("filterRepliesBySeen", filteredResults);

  for (var j = 0; j < filteredResults.length; j++) {

    var currentTopic = topicSystem.findTopicByName(filteredResults[j].topic);
    var currentTopicFlags = currentTopic.flags;

    var repIndex = filteredResults[j].crc;
    var rep = filteredResults[j].reply;
    var inputID = filteredResults[j].trigger_id;

    var seenReply = false;

    // Filter out SPOKEN replies.
    // If something is said on a different trigger we don't remove it.
    // If the trigger is very open ie "*", you should consider putting a {keep} flag on it.
    
    for (var i = 0; i <= 10; i++) {
      var topicItem = user["__history__"]["topic"][i];

      if (topicItem !== undefined) {
        var pastGambit = user["__history__"]["reply"][i];
        var pastInput = user["__history__"]["input"][i];

        // Sometimes the history has null messages because we spoke first.
        if (!_.isNull(pastGambit) && !_.isNull(pastInput)) {
          // Do they match and not have a keep flag
          if (repIndex === pastGambit.crc && 
            pastInput.crc === inputID && 
            keepRegex.test(rep) === false &&
            currentTopicFlags.indexOf("keep") == -1
          ) {
            debug("Already Seen", rep);
            seenReply = true;
          }
        }
      }
    }

    if (!seenReply) {
      bucket.push(filteredResults[j]);
    }
  }

  debug("Bucket", bucket)
  if (!_.isEmpty(bucket)) {
    callback(null, Utils.pickItem(bucket));
  } else {
    callback(true);
  }
} // end filterBySeen


var filterRepliesByFunction = function(replies, user, callback) {
  var filterRegex;

  debug("filterRepliesByFunction", replies);
  // http://rubular.com/r/nyUm49r3Qc
  filterRegex = /\{\s*\^(\w+)\(([\w<>,\s]*)\)\s*\}/i;            

  var filterHandle = function(rep, cb) {

    // We support a single filter function in the reply
    // It returns true/false to aid in the selection.

    if (filterRegex.test(rep.reply)) {
      var filterFunction = rep.reply.match(filterRegex);
      debug("Filter Function Found");

      var pluginName = Utils.trim(filterFunction[1]);
      var partsStr = Utils.trim(filterFunction[2]);
      var parts = partsStr.split(",");
      
      var args  = [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i] != "") {
          args.push(parts[i].trim());
        }
      }
      
      if (gPlugins[pluginName]) {
        args.push(function customFilterFunctionHandle(err, filterReply) {
          rep.reply = Utils.trim(rep.reply.replace(filterFunction[0],""));
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
        rep.reply = Utils.trim(rep.reply.replace(filterFunction[0],""));
        cb(true);
      }
    } else {
      cb(true);
    }
  }

  async.filter(replies, filterHandle, function(filteredReplies){
    debug("filterByFunction Results", filteredReplies);
    filterRepliesBySeen(filteredReplies, user,  function afterFilterRepliesBySeen(err, reply){
      
      if (err) {
        // Keep looking for results
        callback();
      } else {
        var options = {
          plugins: gPlugins,
          scope: gScope
        };

        processTags(reply, user, options, function afterProcessTags(err, reply){
          debug("err, reply", err, reply);
          if (reply === "") {
            callback();
          } else {
            callback(reply, null);
          }
        }); 
      }
    });
  });
}

module.exports = getreply;
