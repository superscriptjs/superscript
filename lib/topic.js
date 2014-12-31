var async = require("async");
var regexreply = require("./regexreply");
var crc = require("crc");
var _ = require("underscore");
var debug = require("debug")("Topic");

var Topic = function(name, triggers, flags, previous, order) {
  this.name = name;
  this.flags = flags;

  this.triggers = processTriggers(triggers);
  // this.previous = processTriggers(previous, true);
  
  this.previous = previous;

  this.order = order.topics;
  this.previousSort = order.previous;
  this.prevtrig = order.prevTrig;
}

Topic.prototype.findMatch = function(message, user, callback) {
  
  var trigger;
  var eachGambitHandle;
  var that = this;
  var matches = [];

  eachGambitHandle = function(crc, cb) {
    var match = false;
    var stars = [];

    trigger = that.findTriggerByID(crc);
    regexreply.postParse(trigger.trigger, message, user, function(regexp) {

      debug("Try to match '" + message.clean + "' against " + trigger.trigger + " (" + regexp + ") topic: " + that.name);
      debug("Try to match '" + message.lemString + "' against " + trigger.trigger + " (" + regexp + ") topic: " + that.name);

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
        debug("Found Match with topic " + that.name);
        if (match.length > 1) {
          for (var j = 1; j <  match.length; j++) {
            stars.push(match[j]);
          }
        }

        matches.push({stars:stars, trigger: trigger, topic: that.name});
      }

      cb();
    });
  } // end EachGambit

  // Lets check to see if we are in a prev before checking the entire topic for a match
  // pre sorted.
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
        
        debug("eachPrevTrigItor", trig, replyID);
        if (trig == replyID) {
          
          var subTrigItor = function(subtrig, cb2) {
            debug("subtrig", subtrig);
            var stars = [];

            // TODO - use method for this.
            var humanside = that.previous[replyID][subtrig].trigger;
            debug("Now try to match " + message.clean + " to " + humanside);
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
        async.each(that.order, eachGambitHandle, function eachGambitHandleComplete(){
          callback(null, matches);
        });
      });
    } else {
      async.each(that.order, eachGambitHandle, function eachGambitHandleComplete(){
        callback(null, matches);
      });      
    }
  } else {
    // No previous triggers in this topic, do a normal trigger match.
    async.each(that.order, eachGambitHandle, function eachGambitHandleComplete(){
      callback(null, matches);
    });    
  }
}

Topic.prototype.findTriggerByID = function(id) {
  for (var i = 0; i < this.triggers.length; i++) {
    if (this.triggers[i].id === id) {
      return this.triggers[i];
    }
  }
}

Topic.prototype.addTrigger = function(rule) {

}

var processTriggers = function(triggers, previous){
  var trig = [];

  for (var crc in triggers) {
    trig.push(new Trigger(crc, triggers[crc]))
  }
  return trig;
}

var Trigger = function(id, triggerData) {  
  this.id = id;
  this.trigger = triggerData.trigger
  this.replies = triggerData.reply;
  this.isQuestion = triggerData.options.isQuestion;
  this.qType = triggerData.options.qType;
  this.qSubType = triggerData.options.qSubType;
}


module.exports = Topic;