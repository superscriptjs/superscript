var async   = require("async");
var Utils   = require("./utils");
var crc     = require("crc");
var _       = require("underscore");
var debug   = require("debug")("GetReply");
var dWarn   = require("debug")("GetReply:Warning");

var regexreply = require("./regexreply");
var processTags = require("./processtags");

var gIncludes;
var gLineage;
var gTopics;
var gPlugins;
var gTopicFlags;

var getreply = function(options, callback) {
  var user = options.user;
  var message = options.message;
  var context = options.type;
  var step = options.step;

  var plugins = options.system.plugins;
  var topicFlags = options.system.topicFlags;
  var sorted = options.system.sorted;
  var thats = options.system.thats;
  var facts = options.system.facts;
  
  // Make these Global.
  gTopics = options.system.topics;
  gIncludes = options.system.includes;
  gLineage = options.system.lineage;

  gPlugins = options.system.plugins;
  gTopicFlags = options.system.topicFlags;

  if (!step) step = 0;

  if (step == 40) {
    dWarn("Max Depth Reached");
    return callback(new Error("max depth reached"), null);
  }
  
  debug("Step depth (" + step + ") with ", message.clean);

  // Create a pointer for the matched data when we find it.
  var matched        = null;
  var matchedTrigger = null;
  var foundMatch     = false;

  // Collect data on this user.
  var topic     = user.getTopic();
  var stars     = [];
  var thatstars = []; // For %Previous
  var reply     = '';

  // Are we in the BEGIN block?
  if (context == "begin") {
    topic = "__begin__";
  }

  if (!gTopics[topic]) {
    dWarn("User " + user.name + " was in an empty topic named '" + topic + "'");
    user.setTopic('random');
    topic = 'random';
  }

  // This method closes over the globals passed in.
  var eachGambitHandle = function(topic) {

    return function(trig, done) {
      var isMatch = false;

      var gambit = gTopics[topic][trig];

      if (!gTopics[topic][trig]) {
        debug("Different Topic", topic, trig);
        gambit = findTriggerByInheritence(topic, trig, 0);
      }

      regexreply.postParse(gambit.trigger, message, user, function(regexp) {
        debug("Try to match '" + message.clean + "' against " + trig + " (" + regexp + ")");
        debug("Try to match '" + message.lemString + "' against " + trig + " (" + regexp + ")");

        var match = false;

        if (gambit.options.isQuestion && message.isQuestion) {
          if (gambit.options.qSubType !== false) {

            // WH, CH, YN TG 
            if (message.qSubType == gambit.options.qSubType) {
              match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
              if (!match) match = message.lemString.match(new RegExp('^' + regexp + '$', "i"));
            } 

            // NUM etc.
            if (message.qtype.indexOf(gambit.options.qType) !== -1) {
              match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
              if (!match) match = message.lemString.match(new RegExp('^' + regexp + '$', "i"));
            } 

          } else {
            // NUM etc.
            if (message.qtype.indexOf(gambit.options.qType) !== -1) {
              debug("QType Match", gambit.options.qType, message.qtype);
              match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
              if (!match) match = message.lemString.match(new RegExp('^' + regexp + '$', "i"));
            } else if (gambit.options.qType === false) {
              // Do we have a question?
              match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
              if (!match) match = message.lemString.match(new RegExp('^' + regexp + '$', "i"));
            }
          }

        } else if (!gambit.options.isQuestion && !gambit.options.qType) {
          
          match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
          if (!match) match = message.lemString.match(new RegExp('^' + regexp + '$', "i"));
        }
      
        if (match && !matched) {
          isMatch = true;
          stars = []; // Leak this
          if (match.length > 1) {
            for (var j = 1; j <  match.length; j++) {
              stars.push(match[j]);
            }
          }
        }

        // A match somehow?
        // TODO add coverage for this block
        if (isMatch && !matched) {
          debug("Found a match!");
          
          // We found a match, but what if the trigger we've matched
          // doesn't belong to our topic? Find it!
          if (!gTopics[topic][trig]) {
            // We have to find it.
            matched = gambit;
          } else {
            debug("Match found in Topic", topic)

            // Leaks this
            matched = gTopics[topic][trig];
          }
          // Leaks this
          matchedTrigger = trig;
        }

        done();
      }); // End PostProcess
    }
  }

  // Global After Handle
  // @context global
  // reply - local
  var afterHandle = function(ireply) {
    debug("IN AfterHandle with:", ireply);
    if (context == "begin") {
      // The BEGIN block can set {topic} and user vars.
      var giveup = 0;
      debug("In 'begin' block looking for topic", ireply)
      // Topic setter.
      var match = ireply.match(/\{topic=(.+?)\}/i);
      while (match) {
        giveup++;
        if (giveup >= 50) {
          dWarn("Infinite loop looking for topic tag!");
          break;
        }
        // TODO Test this block
        var name = match[1];
        this._users[user]["topic"] = name;
        ireply = ireply.replace(new RegExp("{topic=" + this.quotemeta(name) + "}","ig"), "");
        match = ireply.match(/\{topic=(.+?)\}/i); // Look for more
      }
      return callback(null, ireply.trim());
    } else {
      // Process more tags if not in BEGIN.
      debug("Not in 'begin', check for more tags", message.clean);

      var pOptions = {
        user: user, 
        msg: message, 
        reply: ireply, 
        stars: stars, 
        botstars: thatstars,
        step: step, 
        system: options.system
      };

      return processTags(pOptions,  function(err, ireply){

        if (err && err.message !== "max depth reached") {
          debug("Try again");
          // Delete the last matched topic and run though the list again.
          delete options.system.topics[topic][matchedTrigger];
          var ind = options.system.sorted["topics"][topic].indexOf(matchedTrigger);
          options.system.sorted["topics"][topic].splice(ind,1);

          var nOptions = {
            user: user,
            message: message,
            step: (step+1),
            type: "normal",
            system: options.system
          }

          if (step < 40) {
            return getreply(nOptions, callback);  
          } else {
            return callback(null, ireply);  
          }
          
        } else {
          debug("Calling Back with", ireply)
          return callback(null, ireply);
        }

      });
    }
  }

  // Closed over Vars we are tracking
  // matchedTrigger - eachGambitHandle
  // matched - eachGambitHandle
  // stars - eachGambitHandle
  // thatstars - eachGambitHandle
  var topicSearch = function() {
    debug("Searching their topic '" + topic + "' for a match...");

    if (!sorted["topics"][topic]) {
      sorted["topics"][topic] = [];
    }

    var gambitCompleteHandle = function(err, res){

      // Store what trigger they matched on. If their matched trigger is undefined,
      // this will be too, which is great.
      user["__lastmatch__"] = matchedTrigger;

      debug("Did we match?", matched);

      if (matched) {
        if (matched["redirect"]) {
          debug("Redirecting us to '" + matched["redirect"] + "'");

          var pOptions = {
            user: user, 
            msg: message, 
            reply: matched["redirect"], 
            stars: stars, 
            botstars: thatstars,
            step: step, 
            system: options.system
          };

          processTags(pOptions, function(err, redirect) {
            if (err) {
              // TODO test this.
              callback(err, null);
            } else {
              debug("Pretend user said: '" + redirect + "'");
              // We need to fetch the reply for that key.
              var ptOptions = {
                user: user, 
                message: {clean: redirect, qtype: "SYSTEM:sys", lemString:"___SYSTEM___" },
                step: (step+1),
                type: context,
                system: options.system
              }

              return getreply(ptOptions, callback);             
            }
          });
        } else {

          var filterBySeen = function(filteredResults) {
            var bucket = [];
            var keepRegex = new RegExp("\{keep\}", "i");
            var currentTopicFlags = (topicFlags[topic]) ? topicFlags[topic] : [];
            debug("filteredResults", filteredResults, filteredResults.length);
            for (var j = 0; j < filteredResults.length; j++) {

              var repIndex = filteredResults[j].crc;
              var rep = filteredResults[j].reply;

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
                      pastInput.crc === matchedTrigger && 
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

            // Get a random reply.
            // Maybe this could be more intelegent?
            var choice = parseInt(Math.random() * bucket.length);
            
            // Reply should be a string and never undefined.
            reply = (bucket[choice]) ? bucket[choice] : "";

            debug("Looking at choices:", bucket);
            debug("We like this choice", reply);
            afterHandle(reply);
          } // end filterBySeen

          var filterByFunction = function() {
            // http://rubular.com/r/nyUm49r3Qc
            var filterRegex = /\{\s*\^(\w+)\(([\w<>,\s]*)\)\s*\}/i;            

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

            var replies = [];
            for (var repIndex in matched["reply"]) {
              var rep = matched["reply"][repIndex];
              replies.push({crc:repIndex, reply:rep});
            }

            async.filter(replies, filterHandle, function(results){
              debug("FilterByFunction Results", results);
              // Call FilterBySeen
              filterBySeen(results);
            });
          }

          // filterByFunction
          // Calles filterByFunction => filterBySeen
          filterByFunction();
          
        }
      } else {
        debug("We are going to hit AfterHandle with:", reply);
        afterHandle(reply);
      }
    }

    var eachTopic = function(itorTopic, next) {

      debug("itorTopic", itorTopic);

      // This will continue if there is no pre/post topic
      if (sorted["topics"][itorTopic] != undefined) {
        // Repect the sortedset order.
        async.eachSeries(sorted["topics"][itorTopic], eachGambitHandle(itorTopic), function(){
          next();
        });
      } else {
        next();
      }
    }

    // Loop though pre, and post hooks around the actual topic.
    async.eachSeries(["__pre__", topic, "__post__"], eachTopic, gambitCompleteHandle);

  } // End Topic Search
  
  if (step == 0) {

    var allTopics = [ topic ];
    if (gIncludes[topic] || gLineage[topic]) {
      allTopics = _getTopicTree(topic);
    }

    var eachPrevItor = function(top, cb) {
      debug("Checking topic " + top + " for any %Previous's.");

      if (sorted["thats"][top]) {
        // There's one here!
        debug("There's a %Previous in this topic!");

        // Do we have history yet?
        var lastReply = user["__history__"]["reply"][0];

        if (!_.isEmpty(lastReply)) {
          debug("Last reply: " + lastReply.raw);

          lastReply = lastReply.raw;
          var replyID = crc.crc32(lastReply).toString(16);
          // We need to close over lastReply
          // eachPrevTrigItor takes the sorted previous items
          var eachPrevTrigItor = function(trig, cb1) {
            
            debug("eachPrevTrigItor", trig, replyID);
            if (trig == replyID) {

              var subTrigItor = function(subtrig, cb2) {
                  
                var humanside = thats[topic][replyID][subtrig].trigger;
                debug("Now try to match " + message.clean + " to " + humanside);
                match = message.clean.match(new RegExp("^" + humanside + "$"));

                if (match) {
                  debug("Found a match!", top, trig, subtrig );
                  matched = thats[top][trig][subtrig];
                  matchedTrigger = subtrig;
                  
                  // Collect the stars.
                  stars = [];
                  if (match.length > 1) {
                    for (var j = 1, jend = match.length; j < jend; j++) {
                      stars.push(match[j]);
                    }
                  }
                }
                cb2(null);
              };

              async.eachSeries(sorted["that_trig"][top][trig], subTrigItor, function(err, res){
                cb1(null);
              });

            } else {
              cb1(null);
            }
          }

          debug("Sorted Thats", sorted["thats"][top])
          async.eachSeries(sorted["thats"][top], eachPrevTrigItor, function(err, res){
            cb(null);
          });
        } else {
          cb(null); // No need to continue because nothing has been said yet
        }
      } else {
        cb(null); // No need to continue
      }
    }

    async.eachSeries(allTopics, eachPrevItor, function(err, res) {
      
      if (matched) {
        afterHandle(matched["reply"][0]); 
      } else {
        // no match found yet, lets look at topics.
        // We need to get down to the next block
        topicSearch();
      }
    });

  } else {
    debug("Step 1 or more", step);
    // step 1 or more
    // we need to call the next function here too
    topicSearch();
  }
}

var _getTopicTree = function (topic, depth) {
  // Default depth.
  if (typeof(depth) != "number") {
    depth = 0;
  }

  // Break if we're in too deep.
  if (depth > 50) {
    dwarn("Deep recursion while scanning topic tree!");
    return [];
  }

  // Collect an array of all topics.
  var topics = [ topic ];

  // Does this topic include others?
  if (gIncludes[topic]) {
    // Try each of these.
    for (var includes in gIncludes[topic]) {
      topics.push.apply(topics, _getTopicTree(includes, depth+1));
    }
  }

  // Does this topic inherit other topics?
  if (gLineage[topic]) {
    // Try each of these.
    for (var inherits in gLineage[topic]) {
      topics.push.apply(topics, _getTopicTree(inherits, depth+1));
    }
  }

  return topics;
};

var findTriggerByInheritence = function (topic, trig, depth) {
  // Prevent recursion.
  if (depth > 50) {
    debug("Deep recursion detected in findTriggerByInheritence");
    return undefined;
  }

  if (gLineage[topic]) {
    for (var inherits in gLineage[topic]) {
      // See if this inherited topic has our trigger.
      if (gTopics[inherits][trig]) {
        return gTopics[inherits][trig];
      } else {
        // Check what previous topic inherits from.
        var match = findTriggerByInheritence (inherits, trig, (depth+1));
        if (match) {
          return match;
        }
      }
    }
  }

  // See if this topic has an "includes".
  if (gIncludes[topic]) {
    for (var includes in gIncludes[topic]) {
      if (gTopics[includes][trig]) {
        return gTopics[includes][trig];
      } else {
        var match = findTriggerByInheritence( includes, trig, (depth+1));
        if (match) {
          return match;
        }
      }
    }
  }

  // Not much else we can do!
  debug("User matched a trigger, " + trig + ", but I can't find out what topic it belongs to!");
  return undefined;
};

module.exports = getreply;