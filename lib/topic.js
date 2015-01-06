var async = require("async");
var regexreply = require("./regexreply");
var crc = require("crc");
var _ = require("underscore");
var debug = require("debug")("Topic");
var Utils = require("./Utils");

var Topic = function(name, triggers, flags, previous, order) {
  this.name = name;
  this.flags = flags || [];

  this.triggers = processTriggers(triggers);
  this.previous = previous;
  if (order) {
    this.order = order.topics;
    this.previousSort = order.previous || [];
    this.prevtrig = order.prevTrig;
  } else {
    this.order = [];
  }
}

// TODO, move the match logic down into the trigger.
Topic.prototype.findMatch = function(message, user, plugins, scope, callback) {
  debug("FindMatch", this.name); 
  var eachGambitHandle;
  var eachGambit;
  var that = this;
  var matches = [];

  eachGambit = function() {
    async.each(that.order, eachGambitHandle, function eachGambitHandleComplete(){
      callback(null, matches);
    });    
  }

  eachGambitHandle = function(crc, callback) {
    var match = false;
    var stars = [];
    var filterRegex = /\s*\^(\w+)\(([\w<>,\s]*)\)\s*/i;
    var trigger = that.findTriggerByID(crc);

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
        if (trigger.filter) {
          // We need scope and functions
          debug("We have a filter function", trigger.filter);

          var filterFunction = trigger.filter.match(filterRegex);
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
          
          if (plugins[pluginName]) {
            args.push(function customFilterFunctionHandle(err, filterReply) {
              if (filterReply === "true" || filterReply === true) {
                debug("filterReply", filterReply);

                if (trigger.redirect) {
                  debug("Found Redirect Match with topic " + that.name);
                  trigger = that.findTriggerByTrigger(trigger.redirect);
                }

                debug("Found Match with topic " + that.name);
                if (match.length > 1) {
                  for (var j = 1; j <  match.length; j++) {
                    stars.push(match[j]);
                  }
                }

                matches.push({stars:stars, trigger: trigger, topic: that.name});
                
                callback();
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

          if (trigger.redirect) {
            debug("Found Redirect Match with topic " + that.name);
            trigger = that.findTriggerByTrigger(trigger.redirect);
          }

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
        callback();
      }

    }); // end regexReply
  } // end EachGambit

  // Lets check to see if we are in a prev before checking the entire topic for a match
  // pre sorted.
  // TODO, there may be a case where we want to test for prev, but not continue to the topic
  if (!_.isEmpty(this.previous)) {
    debug("We have a previous");
    var lastReply = user["__history__"]["reply"][0];

    if (!_.isEmpty(lastReply)) {
      debug("Last reply: " + lastReply.raw);

      lastReply = lastReply.raw;
      var replyID = crc.crc32(lastReply).toString(16);
      // We need to close over lastReply
      // eachPrevTrigItor takes the sorted previous items
      var eachPrevTrigItor = function(trig, cb1) {
        if (trig == replyID) {
          
          var subTrigItor = function(subtrig, cb2) {
            var stars = [];

            // TODO - use method for this.
            var humanside = that.previous[replyID][subtrig].trigger;
            debug("Try to match (clean)'" + message.clean + "' against " + humanside + "topic: " + that.name);

            match = message.clean.match(new RegExp("^" + humanside + "$"));

            if (match) {
              debug("Found PREV Match with topic " + that.name);
              var ptrigger = new Trigger(subtrig, that.previous[trig][subtrig]);
              
              if (match.length > 1) {
                for (var j = 1; j <  match.length; j++) {
                  stars.push(match[j]);
                }
              }
              matches.push({stars:stars, trigger: ptrigger, topic: that.name});
            }
            cb2(null);
          };

          async.eachSeries(that.prevtrig[trig], subTrigItor, function(err, res){
            cb1(null);
          });

        } else {
          cb1(null);
        }
      }

      // Loop though all previous triggers searching for a match before moving on
      async.eachSeries(that.previousSort, eachPrevTrigItor, function(err, res){
        eachGambit();
      });
    } else {
      eachGambit();
    }
  } else {
    // No previous triggers in this topic, do a normal trigger match.
    eachGambit();
  }

}

Topic.prototype.findTriggerByID = function(id) {
  for (var i = 0; i < this.triggers.length; i++) {
    if (this.triggers[i].id === id) {
      return this.triggers[i];
    }
  }
}

Topic.prototype.findTriggerByTrigger = function(input) {
  for (var i = 0; i < this.triggers.length; i++) {
    if (this.triggers[i].trigger === input) {
      return this.triggers[i];
    }
  }
}

// TODO Add options for Qtypes
// TODO Add regex reply for wildcards
// TODO add sort for order.
Topic.prototype.addTrigger = function(rule, replies, options) {
  
  var trigID = crc.crc32(rule).toString(16);
  var rep = {};

  for (var i = 0; i < replies.length; i++) {
    var replyID = crc.crc32(replies[i]).toString(16);
    rep[replyID] = replies[i];
  }

  var trigData = {
    trigger: rule,
    reply: rep
  }

  var trigger = new Trigger(trigID, trigData);
  this.triggers.push(trigger);
  this.order.unshift(trigID)
  return trigger;
}

var processTriggers = function(triggers, previous){
  var trig = [];
  for (var crc in triggers) {
    trig.push(new Trigger(crc, triggers[crc]))
  }
  return trig;
}

var Trigger = function(id, triggerData) {  

  triggerData.options = triggerData.options || {};

  this.id = id;
  this.trigger = triggerData.trigger
  this.replies = triggerData.reply;
  this.redirect = triggerData.redirect || false;
  this.isQuestion = triggerData.options.isQuestion || false;
  this.qType = triggerData.options.qType || false;
  this.qSubType = triggerData.options.qSubType || false;
  this.filter = triggerData.options.filter;
}

// Adds one reply to the trigger
Trigger.prototype.addReply = function(reply) {

  var replyID = crc.crc32(reply).toString(16);
  this.replies[replyID] = reply;
}

module.exports = Topic;