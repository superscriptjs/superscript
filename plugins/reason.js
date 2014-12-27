
var debug = require("debug")("Reason Plugin");
var history = require("../lib/history");
var Utils = require("../lib/utils");
var _ = require("underscore");
var moment = require("moment");

exports.hasName = function(bool, cb) {
  this.user.get('name', function(e,name){
    if (name !== null) {
      cb(null, (bool == "true") ? true : false)
    } else {
      // We have no name
      cb(null, (bool == "false") ? true : false)
    }
  });
}

exports.findLoc = function(cb) {
  var candidates = history(this.user, { names: true });
  if (!_.isEmpty(candidates)) {
    debug("history candidates", candidates);
    var c = candidates[0];

    if (c.names.length == 1) {
      suggest = "In " + c.names[0];  
    } else if (c.names.length == 2) {
      suggest = "In " + c.names[0] + ", " + c.names[1] + ".";
    } else {
      suggest = "In " + Utils.pickItem(c.names);
    }
  
    cb(null, suggest);
  } else {
    cb(null, "I'm not sure where you lived.");
  }
}

exports.tooAdjective = function(cb) {
  // what is/was too small?
  var message = this.message;
  var candidates = history(this.user, { adjectives: message.adjectives });
  debug("adj candidates", candidates);

  if (candidates.length != 0 && candidates[0].cNouns.length != 0) {
    var choice = candidates[0].cNouns.filter(function(item){ return item.length >= 3 });                   
    suggest = "The " + choice.pop() + " was too " + message.adjectives[0] + ".";
  } else {
    suggest = "";
  }

  cb(null, suggest);  
}

exports.usedFor = function(cb) {
  var that = this;
  this.cnet.usedForForward(that.message.nouns[0], function(e,r){
    var res = (r) ? Utils.makeSentense(r[0].sentense)  : "";
    cb(null, res);
  });
}

exports.makeChoice = function(cb) {
  var that = this;
  // Save the choice so we can refer to our decision later
  var sect = _.difference(that.message.entities, that.message.list);
  // So I believe sect[0] is the HEAD noun

  if(sect.length === 0){
    // What do you like?
    var choice = Utils.pickItem(that.message.list);
    cb(null, "I like " + choice + ".");  
  } else {
    // Which <noun> do you like?
    that.cnet.filterConcepts(that.message.list, sect[0], function(err, results) {
      var choice = Utils.pickItem(results);
      cb(null, "I like " + choice + ".");  
    });    
  }
}

exports.findMoney = function(cb) {

  var candidates = history(this.user, { nouns: this.message.nouns, money: true });
  if (candidates.length != 0) {
    cb(null, "It would cost $" + candidates[0].numbers[0] + ".");
  } else {
    cb(null, "Not sure.");
  }
}

exports.findDate = function(cb){
 var candidates = history(this.user, { date: true });
 if (candidates.length != 0) {
  debug("DATE", candidates[0])
   cb(null, "It is in " + moment(candidates[0].date).format("MMMM") + ".");
 } else {
   cb(null, "Not sure.");
 } 
}