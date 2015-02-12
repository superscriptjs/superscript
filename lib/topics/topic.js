/**
  
  Topics are a grouping of gambits.
  The order of the Gambits are important, and a gambit can live in more than one topic.

**/

var natural = require('natural');
var _ = require("underscore");
var async = require("async");
var regexreply = require("../parse/regexreply");
var findOrCreate = require('mongoose-findorcreate');
var debug = require("debug")("Topics");
var Utils = require("../utils");

var TfIdf = natural.TfIdf;
var tfidf = new TfIdf();

module.exports = function(mongoose) {

  natural.PorterStemmer.attach();

  var topicSchema = new mongoose.Schema({ 
    name: {type: String, index: true, unique: true},
    keep: {type: Boolean, default: false },
    system: {type: Boolean, default: false },
    filter: {type: String, default: ""},
    keywords: {type: Array },
    gambits: [{ type: String, ref: 'Gambit' }]
  });

  topicSchema.pre('save', function (next) {
    var that = this, kw;

    if (!_.isEmpty(this.keywords)) {  
      kw = that.keywords.join(" ");
      if (kw) {
        tfidf.addDocument(kw.tokenizeAndStem(), that.name);
      }
    }
    next();
  });

  topicSchema.methods.sortGambits = function(callback) {
    
    var expandReorder = function(gambitId, cb) {
      Gambit.findById(gambitId, function(err, gambit){
        cb(null, gambit);
      });
    };

    async.map(this.gambits, expandReorder, function(err, newGambitList){
      this.gambits = sortTriggerSet(newGambitList);
      if (callback) {
        callback();
      }
    });
  }

  topicSchema.methods.findMatch = function(message, user, plugins, scope, callback) {
    debug("FindMatch", this.name); 
    var eachGambitHandle;
    var eachGambit;
    var that = this;
    var matches = [];

    eachGambit = function() {
      // Lets Query for Gambits
      // TODO - Pass in match options
      Topic.findOne({name:that.name}, 'gambits')
        .populate('gambits')
        .exec(function(err, mgambits) {
          var iter = function (gambit, cb) {
            Reply.populate(gambit, { path: 'replies' }, cb);
          };

          async.each(mgambits.gambits, iter, function done(err) {
            async.each(mgambits.gambits, eachGambitHandle, function eachGambitHandleComplete(){
              callback(null, matches);
            });  
          });
        }
      )
    }

    eachGambitHandle = function(trigger, callback) {

      var match = false;
      var stars = [];
      var filterRegex = /\s*\^(\w+)\(([\w<>,\|\s]*)\)\s*/i;

      regexreply.postParse(trigger.trigger, message, user, function(regexp) {

        debug("Try to match (clean)'" + message.clean + "' against " + trigger.trigger + " (" + regexp + ") topic: " + that.name);
        debug("Try to match (lemma)'" + message.lemString + "' against " + trigger.trigger + " (" + regexp + ") topic: " + that.name);

        if (trigger.isQuestion && message.isQuestion) {
          if (trigger.qSubType !== false) {
            // WH, CH, YN TG 
            if (message.qSubType == trigger.qSubType) {
              match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
              if (!match) match = message.lemString.match(new RegExp('^' + regexp + '$', "i"));
            } 
            // NUM etc.
            if (message.qtype.indexOf(trigger.qType) !== -1) {
              match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
              if (!match) match = message.lemString.match(new RegExp('^' + regexp + '$', "i"));
            }
          } else {
            // NUM etc.
            if (message.qtype.indexOf(trigger.qType) !== -1) {
              debug("QType Match", trigger.qType, message.qtype);
              match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
              if (!match) match = message.lemString.match(new RegExp('^' + regexp + '$', "i"));
            } else if (trigger.qType === false) {
              // Do we have a question?
              match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
              if (!match) match = message.lemString.match(new RegExp('^' + regexp + '$', "i"));
            }
          }

        } else if (!trigger.isQuestion && !trigger.qType) {
          match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
          if (!match) match = message.lemString.match(new RegExp('^' + regexp + '$', "i"));
        }

        if (match) {
          if (trigger.filter !== "") {
            // We need scope and functions
            debug("We have a filter function", trigger.filter);

            var filterFunction = trigger.filter.match(filterRegex);
            debug("Filter Function Found", filterFunction);

            var pluginName = Utils.trim(filterFunction[1]);
            var partsStr = Utils.trim(filterFunction[2]);
            var parts = partsStr.split(",");
            
            var args  = [];
            for (var i = 0; i < parts.length; i++) {
              if (parts[i] != "") {
                args.push(parts[i].trim());
              }
            }
            
            if (plugins[pluginName]) {
              args.push(function customFilterFunctionHandle(err, filterReply) {
                if (filterReply === "true" || filterReply === true) {
                  debug("filterReply", filterReply);

                  if (trigger.redirect !== "") {
                    debug("Found Redirect Match with topic " + that.name);
                    Topic.findTriggerByTrigger(trigger.redirect, function(err, gambit){
                      trigger = gambit;
                      callback();  
                    });
                    
                  } else {
                    debug("Found Match with topic " + that.name);
                    if (match.length > 1) {
                      for (var j = 1; j <  match.length; j++) {
                        stars.push(match[j]);
                      }
                    }

                    matches.push({stars:stars, trigger: trigger, topic: that.name});
                    callback();
                  }
                } else {
                  debug("filterReply", filterReply)
                  callback();
                }
              });

              debug("Calling Plugin Function", pluginName);
              plugins[pluginName].apply(scope, args);

            } else {
              dWarn("Custom Filter Function not-found", pluginName);
              callback();
            }
          } else {

            var afterHandle = function(cb) {
              debug("Found Match with topic " + that.name);
              if (match.length > 1) {
                for (var j = 1; j <  match.length; j++) {
                  stars.push(match[j]);
                }
              }

              // Tag the message with the found Trigger we matched on
              message.gambitId = trigger._id;
              debug("Updating Message Object with Trigger Match", message.gambitId)
              matches.push({stars:stars, trigger: trigger, topic: that.name});
              cb();
            }

            if (trigger.redirect !== "") {
              debug("Found Redirect Match with topic ", that.name);
              Topic.findTriggerByTrigger(trigger.redirect, function(err, gambit){
                debug("Redirecting to New Gambit", gambit)
                trigger = gambit
                afterHandle(callback);
              });
            } else {
              afterHandle(callback);
            }
          }
        } else {
          callback();
        }

      }); // end regexReply
    } // end EachGambit


    // Search for previous match
    var lastReply = user["__history__"]["reply"][0];
    if (!_.isEmpty(lastReply)) {
      debug("Last reply: " + lastReply.raw);
      var replyId = lastReply.replyId;

      Reply.findOne({id:replyId, gambits:{$not: {$size: 0}}})
        .populate('gambits')
        .exec(function(err, mgambits){

          var iter = function (gambit, cb) {
            Reply.populate(gambit, { path: 'replies' }, cb);
          };

          if (mgambits) {
            async.each(mgambits.gambits, iter, function done(err) {
              async.each(mgambits.gambits, eachGambitHandle, function eachGambitHandleComplete(){
                callback(null, matches);
              });
            });          
          } else {
            // No results, 
             eachGambit(); 
          }

        }
      ); // exec
      
    } else {
      // No previous, normal search
      eachGambit();  
    }
  }

  // This will find a gambit in any topic
  topicSchema.statics.findTriggerByTrigger = function(input, callback) {
    Gambit.findOne({input:input}).exec(callback)
  }

  topicSchema.statics.findByName = function(name, callback) {
    var that = this;
    this.findOne({name:name}, {}, callback);
  }

  topicSchema.statics.findPendingTopicsForUser = function(user, msg, callback) {
    
    var that = this;
    var aTopics = [];
    var docs = [];

    that.find({}, function(err, topics) {
      
      tfidf.tfidfs(msg.lemString.tokenizeAndStem(), function(i,m,k){
        if (k != "__pre__" && k != "__post__")
          docs.push({topic:k,score:m});
      });

      var topicOrder = _.sortBy(docs, function(item){return item.score}).reverse();
      var allTopics = _.map(topicOrder, function(item, val){ return item.topic;});

      // All topics with keywords.. we may have topics with new keywords? 
      // like random or dynamically created topics

      // Move the current topic to the top of the stack,
      // This allows us to match previous rejoiners
      var currentTopic = user.getTopic();
      allTopics.unshift(currentTopic);

      var otherTopics = topics;
      otherTopics = _.map(otherTopics, function(item) {return item.name});
      otherTopics = _.difference(otherTopics, allTopics);

      // Filter out system topics

      allTopics = _.filter(allTopics, function(topicName, val) {
        for (var i = 0; i < topics.length; i++) {
          var topic = topics[i];
          if (topic.name == topicName) {
            return !topic.system
          } else {
            return true;
          }
        }
      });

      aTopics.push("__pre__");

      for (var i = 0; i < allTopics.length; i++) {
        if (allTopics[i] != "__post__" && allTopics[i] != "__pre__" ) {
          aTopics.push(allTopics[i]);    
        }
      }

      for (var i = 0; i < otherTopics.length; i++) {
        if (otherTopics[i] != "__post__" && otherTopics[i] != "__pre__" ) {
          aTopics.push(otherTopics[i]);
        }
      }
      
      aTopics.push("__post__");
      callback(null, aTopics);
    });
  }

  topicSchema.plugin(findOrCreate);

  try {
    return mongoose.model('Topic', topicSchema);
  } catch(e) {
    return mongoose.model('Topic');
  }
}



var sortTriggerSet = function (triggers) {

  // Create a priority map.
  var prior = {
    0: [] // Default priority = 0
  };

  // Sort triggers by their weights.
  for (var i = 0, end = triggers.length; i < end; i++) {
    var trig = triggers[i];
    var match  = trig.input.match(/\{weight=(\d+)\}/i);
    var weight = 0;
    if (match && match[1]) {
      weight = match[1];
    }

    if (!prior[weight]) {
      prior[weight] = [];
    }
    prior[weight].push(trig);
  }

  // Keep a running list of sorted triggers for this topic.
  var running = [];

  // Sort them by priority.
  var prior_sort = Object.keys(prior).sort(function(a,b) { return b - a });
  for (var i = 0, end = prior_sort.length; i < end; i++) {
    var p = prior_sort[i];
    debug("Sorting triggers with priority " + p);

    // Loop through and categorize these triggers.
    var track = {};

    for (var j = 0, jend = prior[p].length; j < jend; j++) {
      var trig = prior[p][j];
    
      inherits = -1;
      if (!track[inherits]) {
        track[inherits] = initSortTrack();
      }

      if (trig.qType != "") {
        // Qtype included
        var cnt = trig.qType.length;
        debug("Has a qType with " + trig.qType.length + " length.");
        
        if (!track[inherits]['qtype'][cnt]) {
          track[inherits]['qtype'][cnt] = [];
        }
        track[inherits]['qtype'][cnt].push(trig);

      } else if (trig.input.indexOf("*") > -1) {
        // Wildcard included.
        var cnt = Utils.wordCount(trig.input);
        debug("Has a * wildcard with " + cnt + " words.");
        if (cnt > 1) {
          if (!track[inherits]['wild'][cnt]) {
            track[inherits]['wild'][cnt] = [];
          }
          track[inherits]['wild'][cnt].push(trig);
        } else {
          track[inherits]['star'].push(trig);
        }
      }
      else if (trig.input.indexOf("[") > -1) {
        // Optionals included.
        var cnt = Utils.wordCount(trig.input);
        debug("Has optionals with " + cnt + " words.");
        if (!track[inherits]['option'][cnt]) {
          track[inherits]['option'][cnt] = [];
        }
        track[inherits]['option'][cnt].push(trig);
      } else {
        // Totally atomic.
        var cnt = Utils.wordCount(trig.input);
        debug("Totally atomic trigger and " + cnt + " words.");
        if (!track[inherits]['atomic'][cnt]) {
          track[inherits]['atomic'][cnt] = [];
        }
        track[inherits]['atomic'][cnt].push(trig);
      }
    }

    // Move the no-{inherits} triggers to the bottom of the stack.
    track[0] = track['-1'];
    delete track['-1'];


    // Add this group to the sort list.
    var track_sorted = Object.keys(track).sort(function(a,b) { return a-b });
    for (var j = 0, jend = track_sorted.length; j < jend; j++) {
      var ip = track_sorted[j];
      debug("ip=" + ip);

      var kinds = ["qtype", "atomic", "option", "alpha", "number", "wild"];
      for (var k = 0, kend = kinds.length; k < kend; k++) {
        var kind = kinds[k];
        
        var kind_sorted = Object.keys(track[ip][kind]).sort(function(a,b) { return b-a });
        for (var l = 0, lend = kind_sorted.length; l < lend; l++) {
          var item = kind_sorted[l];
          running.push.apply(running, track[ip][kind][item]);
        }
      }

      // We can sort these using Array.sort
      var under_sorted = track[ip]['under'].sort( function(a,b) { return b.length - a.length });
      var pound_sorted = track[ip]['pound'].sort( function(a,b) { return b.length - a.length });
      var star_sorted  = track[ip]['star'].sort( function(a,b) { return b.length - a.length });
      
      running.push.apply(running, under_sorted);
      running.push.apply(running, pound_sorted);
      running.push.apply(running, star_sorted);
    }
  }
  return running;
};

var initSortTrack = function () {
  return {
    'qtype': {}, // Sort by Question Types Length
    'atomic': {}, // Sort by number of whole words
    'option': {}, // Sort optionals by number of words
    'alpha':  {}, // Sort alpha wildcards by no. of words
    'number': {}, // Sort number wildcards by no. of words
    'wild':   {}, // Sort wildcards by no. of words
    'pound':  [], // Triggers of just #
    'under':  [], // Triggers of just _
    'star':   []  // Triggers of just *
  };
};