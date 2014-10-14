var debug   = require("debug")("Self");
var async   = require("async");
var _       = require("underscore");
var history = require("../history");
var Utils   = require("../utils");

exports.check = function(message, user, facts, cnet, cb) {
  debug("In Self")
  var suggest = "";
  // User Aquisition
  if (message.isQuestion && (_.contains(message.pronouns, "your") || _.contains(message.pronouns, "you"))) {
    
    if (message.dict.containsHLC("own")) {
      if (message.dict.containsHLC("favorite")) {
        suggest = "I don't have a favorite " + findThing(message) + ".";
      } else if (message.dict.containsHLC("objects")) {
        if (message.dict.fetchHLC("objects").pos === "NNS") {
          suggest = "I don't own any.";
        } else {
          suggest = "I don't own one.";
        }
      }
    } else if(message.dict.containsHLC("read")) {
      suggest = "Yes I like to read";
    } else if (message.dict.containsHLC("favorite")) {
      var thing = findThing(message);
      suggest = findOrAquire(thing, message, facts);
    } else {

      var s = identity(message, user);
      if (s) {
        suggest = s;
      } else {
        suggest = "";
      }
    }
    cb(null, suggest);
  } else {
    // Okay, not a question.
    
    var suggest = identity(message, user);

    cb(null, suggest);    
  }
};


exports.identity = identity = function(message, user) {
  var suggest = "";
  if (_.contains(message.pronouns, "I") || _.contains(message.pronouns, "my")) {    
    // identity? + name on file.
    if (message.dict.containsHLC("identity") && message.names.length != 0) {

      // Did we already have his name?!?
      var candidates = history(user, { names: message.names[0]});
      if (candidates.length !== 0 || user.get('name') !== -1) {
        suggest = "I know, you already told me your name.";
      } else {
        suggest = "Nice to meet you, " + message.names[0] + ".";
        user.set('name', message.names[0]);
      }        
    }    
  }
  return suggest;
}

var findThing = function(message) {
  return message.cNouns[0];
};

var findOrAquire = function(thing, message, facts) {
  // Do I have this item already?
  // TODO: Thing could be a complex word like "french fries" and not exist in the dict.
  var thing = message.dict.get(thing);
  // debug("Thing", thing, message.dict.get(thing))
  var v1 = facts.query("direct_sv", thing.lemma, "favorite");
  var v2 = facts.query("direct_sv", thing.lemma, "own");

  if (_.isEmpty(v1) && _.isEmpty(v2)) {
    // What do we know about this?
    if (thing.lemma == "color") {
      debug("--", JSON.stringify(null, 2, facts.query("direct_s", "colors")));
    }
  }

  debug("F or O", v1, v2);
  return "red";

}