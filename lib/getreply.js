var async   = require("async");
var Utils   = require("./utils");
var crc     = require("crc");
var debug   = require("debug")("GetReply");
var dWarn   = require("debug")("GetReply:Warning");

var regexreply = require("./regexreply");
var processTags = require("./processtags");

var gIncludes;
var gLineage;
var gTopics;

var getreply = function(options, callback) {
  var user = options.user;
  var message = options.message;
  var context = options.type;
  var step = options.step;

  var plugins = options.system.plugins;
  var topicFlags = options.system.topicFlags;
  var sorted = options.system.sorted;
  var thats = options.system.thats;
  
  // Make these Global.
  gTopics = options.system.topics;
  gIncludes = options.system.includes;
  gLineage = options.system.lineage;

  if (!step) step = 0;

  if (step == 40) {
    dWarn("Max Depth Reached");
    return callback(new Error("max depth reached"), null);
  }

  if(message)
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
  var eachGambitHandle = function(trig, done) {
    var isMatch = false;

    var gambit = gTopics[topic][trig];

    if (!gTopics[topic][trig]) {
      // We have to find it.
      debug("Different Topic")
      gambit = findTriggerByInheritence(topic, trig, 0);
    }

    regexreply.postParse(gambit.trigger, user, function(regexp) {

      debug("Try to match '" + message.clean + "' against " + trig + " (" + gambit.trigger + ")");

      var match = false;

      if (gambit.options.isQuestion && message.isQuestion) {
        if (gambit.options.qSubType !== false) {

          // WH, CH, YN TG 
          if (message.qSubType == gambit.options.qSubType) {
            match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
          } 

          // NUM etc.
          if (message.qtype.indexOf(gambit.options.qType) !== -1) {
            match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
          } 

        } else {
          // NUM etc.
          if (message.qtype.indexOf(gambit.options.qType) !== -1) {
            match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
          } else if (gambit.options.qType === false) {
            // Do we have a question?
            match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
          }
        }

      } else if (!gambit.options.isQuestion && !gambit.options.qType) {
        match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
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
        if (err) {
          dWarn("Error in ProcessTags Callback", err);
          return callback(err, null);
        } else {
          debug("Calling Back with", ireply)
          return callback(null, ireply);
        }

        // TODO - Re-Implement this
        // if (err && err.message !== "max depth reached") {
        //  debug("Error from Custom Function... continue to next message", err);
        //  var options = {
        //    user: user, 
        //    topics: topics, 
        //    sorted: sortedSet, 
        //    message: message,
        //    plugins: plugins,
        //    step: (step+1),
        //    type: "normal",
        //    topicFlags: topicFlags
        //  }
        //  return getreply(options, callback);
        // } else {
        //  debug("Calling Back with", ireply)
        //  return callback(null, ireply);
        // }
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

    // Repect the sortedset order.
    async.eachSeries(sorted["topics"][topic], eachGambitHandle, function(err, res){

      // Store what trigger they matched on. If their matched trigger is undefined,
      // this will be too, which is great.
      user["__lastmatch__"] = matchedTrigger;

      debug("Matched", matched);
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
                message: {clean: redirect, qtype: "SYSTEM:sys" },
                step: (step+1),
                type: context,
                system: options.system
              }

              return getreply(ptOptions, callback);             
            }

          });
        } else {
          var bucket = [];
          for (var rep_index in matched["reply"]) {
            var rep = matched["reply"][rep_index];
            var weight = 1;
            var match  = rep.match(/\{weight=(\\d+?)\}/i);
            if (match) {
              weight = match[1];
              if (weight <= 0) {
                dWarn("Can't have a weight <= 0!");
                weight = 1;
              }
            }

            for (var j = 0; j < weight; j++) {
              bucket.push(rep);
            }
          }

          // Get a random reply.
          var choice = parseInt(Math.random() * bucket.length);
          reply = bucket[choice];
          debug("Looking at choices:", bucket)
          debug("We like this choice", reply)
          afterHandle(reply);
        }
      } else {
        debug("We are going to hit AH with:", reply);
        afterHandle(reply);
      }

    }); // End Each 
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

        if (lastReply) {
          debug("Last reply: " + lastReply.raw);

          lastReply = lastReply.raw;
          var replyID = crc.crc32(lastReply).toString(16);
          // We need to close over lastReply
          // eachPrevTrigItor takes the sorted previous items
          var eachPrevTrigItor = function(trig, cb1) {
            
            debug("eachPrevTrigItor", trig, replyID);
            if (trig == replyID) {
              // This trigger should have items to match human side against.
              // We are no longer collecting stars on the bot side for previous

              //   thatstars = []; // Collect the bot stars in case we need them.
              //   for (var k = 1; k < match.length; k++) {
              //     thatstars.push(match[k]);
              //   }

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

// TODO - Re-implement this.
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

// Given a topic and a trigger, find the pointer to the trigger's data.
// This will search the inheritence tree until it finds the topic that
// the trigger exists in.
var findTriggerByInheritence = function (topic, trig, depth) {
  // Prevent recursion.
  if (depth > 50) {
    debug("Deep recursion detected while following an inheritence trail!");
    return undefined;
  }

  debug("Finding by Inh", topic, trig);


  // Inheritence is more important than inclusion: triggers in one topic can
  // override those in an inherited topic.
  if (gLineage[topic]) {
    for (var inherits in gLineage[topic]) {
      // See if this inherited topic has our trigger.
      if (gTopics[inherits][trig]) {
        return gTopics[inherits][trig];
      } else {
        // Check what THAT topic inherits from.
        var match = findTriggerByInheritence (
          inherits, trig, (depth+1)
        );
        if (match) {
          // Found it!
          return match;
        }
      }
    }
  }

  // See if this topic has an "includes".
  if (gIncludes[topic]) {
    for (var includes in gIncludes[topic]) {
      // See if this included topic has our trigger.
      if (gTopics[includes][trig]) {
        // It does!
        return gTopics[includes][trig];
      } else {
        // Check what THAT topic includes.
        var match = findTriggerByInheritence( includes, trig, (depth+1));
        if (match) {
          // Found it!
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