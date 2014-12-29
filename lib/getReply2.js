var async = require("async");
var _ = require("underscore");
var debug = require("debug")("GetReply");
var dWarn = require("debug")("GetReply:Warning");
var Utils = require("./utils");
var processTags = require("./processtags");

var topicSystem;

var getreply = function(options, callback) {
  var user = options.user;
  var message = options.message;
  var step = options.step;

  var plugins = options.system.plugins;
  var facts = options.system.facts;
  
  // New TopicSystem
  topicSystem = options.system.topicsSystem;

  // Find Topics for User
  var aTopics = topicSystem.findPendingTopicsForUser(user);

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
  return function(reply) {
    if (reply) {
      processTags(reply, user, callback);  
    } else {
      callback("NOREPLY", null);
    }
    
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


var matchItorHandle = function(user) {
  return function(match, callback) {
    var replies = [];
  
    for (var repIndex in match.trigger.replies) {
      var rep = match.trigger.replies[repIndex];
      replies.push({stars:match.stars, crc:repIndex, reply:rep, trigger_id: match.trigger.id, topic: match.topic});
    }

    // Find a reply for the match.
    filterRepliesByFunction(replies, user, callback);
  }
}

          
var filterRepliesBySeen = function(filteredResults, user, callback) {
  var bucket = [];
  var keepRegex = new RegExp("\{keep\}", "i");

  debug("filterRepliesBySeen", filteredResults, filteredResults.length);
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
            debug("Aleady Seen", rep);
            seenReply = true;
          }
        }
      }
    }

    if (!seenReply) {
      bucket.push(rep);
    }
  }

  // Reply should be a string and never undefined.
  var choice = Utils.pickItem(bucket)  
  reply = (bucket[choice]) ? bucket[choice] : "";

  debug("Looking at choices:", bucket);
  debug("We like this choice", reply);
  callback(reply);
} // end filterBySeen


// TODO - Where is plugins and Scope!
var filterRepliesByFunction = function(replies, user, callback) {
  var filterRegex;

  // http://rubular.com/r/nyUm49r3Qc
  filterRegex = /\{\s*\^(\w+)\(([\w<>,\s]*)\)\s*\}/i;            

  var filterHandle = function(rep, cb) {
    debug("Choice", rep.reply);

    // We support a single filter function in the reply
    // It returns true/false to aid in the selection.

    if (filterRegex.test(rep.reply)) {
      var filterFunction = rep.reply.match(filterRegex);
      debug("Filter Function Found");

      var pluginName = Utils.trim(filterFunction[1]);
      var partsStr = Utils.trim(filterFunction[2]);
      var parts = partsStr.split(",");
      
      var scope = {
        message: message,
        user: user,
        facts: facts
      }

      var args  = [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i] != "") {
          args.push(parts[i].trim());
        }
      }
      
      if (plugins[pluginName]) {
        args.push(function customFilterFunctionHandle(err, filterReply) {
          rep.reply = Utils.trim(rep.reply.replace(filterFunction[0],""));
          if (filterReply === "true" || filterReply === true) {
            cb(true);
          } else {
            cb(false);
          }
        });

        debug("Calling Plugin Function", pluginName);
        plugins[pluginName].apply(scope, args);

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
    debug("FilterByFunction Results", filteredReplies);
    filterRepliesBySeen(filteredReplies, user, callback);
  });
}

module.exports = getreply;
