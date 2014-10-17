var debug   = require("debug")("Self");
var async   = require("async");
var _       = require("underscore");
var history = require("../history");
var Utils   = require("../utils");
var wordnet = require("../wordnet");

exports.check = function(message, user, facts, cnet, cb) {
  debug("In Self")
  var suggest = "";
  // User Aquisition
  if (message.isQuestion && (_.contains(message.pronouns, "your") || _.contains(message.pronouns, "you"))) {
    
    if (message.dict.containsHLC("own")) {
      debug("OWN");
      if (message.dict.containsHLC("favorite")) {
        debug("FAVORITE");
        suggest = "I don't have a favorite " + findThing(message) + ".";
      } else if (message.dict.containsHLC("objects")) {
        debug("OBJECT");
        if (message.dict.fetchHLC("objects").pos === "NNS") {
          suggest = "I don't own any.";
        } else {
          suggest = "I don't own one.";
        }
      } else {
        var thing = findThing(message);
        var name = facts.query("direct_sv", thing, "botProp");
        if (!_.isEmpty(name)) {
          suggest = "I like " + Utils.ucwords(name[0]) + ".";
        }
      }
      cb(null, suggest);
    } else if(message.dict.containsHLC("read")) {
      // TODO - This is why programming late is a bad idea
      suggest = "Yes I like to read.";
      cb(null, suggest);
    } else if (message.dict.containsHLC("acquire_imperatives")) {
      // what drink to you prefer a, b, c.
      if (message.qSubType == "CH") {
        // Save the choice so we can refer to our decision later
        var sect = _.difference(message.things, message.list);
        // So I believe sect[0] is the HEAD noun

        cnet.filterConcepts(message.list, sect[0], function(err, results) {
          var choice = Utils.pickItem(results);
          suggest = "I like " + choice + ".";
          cb(null, suggest);  
        });

        // cnet.relatedConceptsArray(message.list, function(err, rel) {
        //   debug("----", rel);
        //   // facts.createfact(choice, "favorite", "")
        //   suggest = "I like " + choice + ".";
        //   cb(null, suggest);
        // })
      }

    } else if (message.dict.containsHLC("favorite")) {
      // What is your favourite x?

      var thing = findThing(message);
      // Is thing a HLC?
      debug("favorite", thing);

      var examplesOfThing = facts.query("direct_sv", thing, "example");

      if (!_.isEmpty(examplesOfThing)) {
        debug("Examples LD", examplesOfThing);
        suggest = "I like " + Utils.pickItem(examplesOfThing) + ".";
        // TODO - Save for later.
        cb(null, suggest);

      } else {
        // Okay, if we don't have an example of thing, lets try Wordnet directly.

        wordnet.lookup(thing+ "~n", '~', function(er, examplesOfThing){
          if (!_.isEmpty(examplesOfThing)) {
            debug("Examples WN", examplesOfThing);
            suggest = "I like " + Utils.pickItem(examplesOfThing) + ".";
            // TODO - Save for later (same as above).
          } else {
            suggest = "I don't have a favorite " + thing + ".";  
          }

          cb(null, suggest);
        });
      }

      // debug("HLC", message.dict.containsHLC(thing));
      // debug("IS HLC", facts.query("direct_sv", thing, "isa"));
      // debug("IS HLC2", facts.query("direct_sv", thing, "example"));



    } else {
      var s = identity(message, user);
      suggest = (s) ? s : "";
      cb(null, suggest);
    }
    // cb(null, suggest);
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
  var thing = "";
  if (!_.isEmpty(message.things)) {
    thing = message.things[0]
  } else if (!_.isEmpty(message.cNouns)) {
    thing = message.cNouns[0];
  }

  return thing;
};

var findOrAquire = function(thing, message, facts) {
  // Do I have this item already?

  // TODO: Thing could be a complex word like "french fries" and not exist in the dict.
  var v1 = facts.query("direct_sv", thing, "favorite");
  var v2 = facts.query("direct_sv", thing, "own");

  // var v1 = facts.query("direct_sv", tword.lemma, "favorite");
  // var v2 = facts.query("direct_sv", tword.lemma, "own");

  // if (_.isEmpty(v1) && _.isEmpty(v2)) {
  //   // What do we know about this?
  //   if (tword.lemma == "color") {
  //     debug("--", JSON.stringify(null, 2, facts.query("direct_s", "colors")));
  //   }
  // }

  debug("F or O", v1, v2);
  return "red";

}