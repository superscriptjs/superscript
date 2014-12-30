var async = require("async");
var regexreply = require("./regexreply");
var debug = require("debug")("Topic");

var Topic = function(name, triggers, flags, order) {
  this.name = name;
  this.triggers = processTriggers(triggers);
  this.flags = flags;
  this.order = order;
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
  }

  async.each(this.order, eachGambitHandle, function eachGambitHandleComplete(){
    callback(null, matches);
  });
}


Topic.prototype.findTriggerByID = function(id) {
  for (var i = 0; i < this.triggers.length; i++) {
    if (this.triggers[i].id === id)
      return this.triggers[i];
  }
}


Topic.prototype.addTrigger = function(rule) {

}


var processTriggers = function(triggers){
  var trig = []
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