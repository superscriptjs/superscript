var debug   = require("debug")("AutoReply:HumReply");
var _       = require("underscore");
var self    = require("./self");
var history = require("../history");
var Utils   = require("../utils");

module.exports = function(message, facts, cnet, user, cb) {

  var parts = message.qtype.split(":");
  var fine = parts[1];

  var suggest = "";

  switch (fine) {
    case "ind": 

    // what is your name
    // What is there name or called 
    if (_.contains(message.pronouns, "your") || _.contains(message.pronouns, "you")) {
      if (message.dict.containsHLC("identity") && message.names.length == 0) {
        suggest = "My name is Brit.";
      }
    } else {
      var candidates = history(user, { nouns: message.nouns });
      var candidates2 = history(user, { names: true });
      
      // TODO, roll though the candidates.
      // If one name is there, perfect.
      // If multiple names, pick one 
      // If no names, maybe the noun was not Proper ?
      if (!_.isEmpty(candidates)) {

        debug("history candidates", candidates);
        var c = _.max(candidates, function(i) { return i.score});

        // If we have a name in the orig message we probably want something else,
        // in: I have a brother called Stuart. Who is Stuart
        if (_.isEmpty(_.difference(c.names, message.names))) {
          // We might want to go do HLC here
          // mashing on cnouns like this is hacky
          var choice = c.cNouns.filter(function(item){ return item.length >= 3 });
          suggest = c.names[0] + " is your " + choice[0] + ".";

        } else {
          if (c.names.length == 1) {
            suggest = c.names[0];
          } else if (c.names[0]) {
            suggest = c.names[0] + "?"
          }            
        }

        debug("Using History candidates", suggest);

      } else if (!_.isEmpty(candidates2)) {
        // We have some names in the candidate
        
        debug("history candidates2", candidates2);
        debug("message", message);
        var prevMessage = candidates2[0];
        
        if (prevMessage.names.length === 1) {
          suggest = "It is " + prevMessage.names[0];
        } else if (prevMessage.names.length > 1) {

          // This could be:
          // Jane is older than Janet. Who is the youngest?
          // My parents are John and Susan. What is my mother called?
          if (message.compareWords.length == 1 || message.adjectives.length == 1 && _.isEmpty(message.names)) {
            
            var compareWord = (message.compareWords[0]) ? message.compareWords[0] : message.adjectives[0];
            var ind = message.words.indexOf(compareWord);
            var lemCmpWord1 = message.lemWords[ind];
      
            // Get the candidate lemWord
            var compareWord2 = (prevMessage.compareWords[0]) ? prevMessage.compareWords[0] : prevMessage.adjectives[0];
            var ind2 = prevMessage.words.indexOf(compareWord2);
            var lemCmpWord2 = prevMessage.lemWords[ind2];

            debug("LemWords", lemCmpWord1, lemCmpWord2);

            var f1 = facts.query("direct_sv", lemCmpWord1, "opposite");
            var f2 = facts.query("direct_vo", "opposite", lemCmpWord1);
            var isOppisite = _.contains(_.unique(f1.concat(f2)), lemCmpWord2);

            if (isOppisite) {
              debug("Terms are oppisite");
              suggest = prevMessage.nouns[1] + ".";
            } else {
              debug("Terms are not oppisite");
              suggest = "Not sure.";
            }

          } else if (_.isEmpty(message.names) && message.nouns.length >= 1){
            // We have a question with 1 noun, and a candidate with 2 names.
            // What is my Mother called?
            var hlc = message.dict.get(message.nouns[0]).hlc;
            if (_.contains(hlc, "she")) {
              debug("--", message.nouns[0], "she")
              // We need to check to see if the names have gender]
              var s = [];
              if (_.contains(prevMessage.dict.get(prevMessage.names[0]).hlc, "girl_names")) {
                s.push(prevMessage.names[0])
                debug("Yep!", prevMessage.names[0])
                suggest = prevMessage.names[0];
              } else if (_.contains(prevMessage.dict.get(prevMessage.names[1]).hlc, "girl_names")){
                suggest = prevMessage.names[1];
              } else {
                debug("Not sure?");
                suggest = Utils.pickItem(prevMessage.names);
              }
            } else if (_.contains(hlc, "he")) {
              debug("--", message.nouns[0], "he")
              if (_.contains(prevMessage.dict.get(prevMessage.names[0]).hlc, "boy_names")) {
                suggest = prevMessage.names[0];
              } else if (_.contains(prevMessage.dict.get(prevMessage.names[1]).hlc, "boy_names")){
                suggest = prevMessage.names[1];
              } else {
                debug("Not sure?");
                suggest = Utils.pickItem(prevMessage.names);
              }
            } else {
              debug("Not sure?");
              suggest = Utils.pickItem(prevMessage.names);
            }
          }
        }

      } else {
        // Concept Lookup
        // WHO IS Elvis Presley?
        debug("Concept Fallback");
        var m = false;

        if (message.names.length == 1 && message.concepts.length != 0) {
          for (var i = 0; i < message.concepts.length; i++) {
            if (message.concepts[i].text == message.names[0].toLowerCase()) {
              m = message.concepts[i].text;
            }
          }

          if (m) {
            debug("Concept Found", m);

            // TODO, Refactor this. We need to call the CB and not return

            // cnet.isAForward(m, function(err, concepts) {
            //   if (concepts.length != 0) {
            //     var cid = Utils.getRandomInt(0, concepts.length - 1);

            //     if (message.qSubType == "YN") {
            //       suggest = "Yes, " + concepts[cid].sentense;
            //     } else {
            //       suggest = concepts[cid].sentense;
            //     }
            //     debug("Whooops", suggest);
            //   } else {
            //     if (message.qSubType == "YN") {
            //       suggest = "I have no idea who " + message.names[0] + " is.";
            //     } else {
            //       suggest = "I'm not sure.";
            //     }
            //     debug("Whooops", suggest);
            //   }
            // })
          } else {
            if (message.qSubType == "YN") {
              suggest = "I have no idea who " + message.names[0] + " is.";
            } else {
              suggest = "I'm not sure.";
            }            
          }

        } else if (message.nouns.length == 1 && message.concepts.length != 0) {
          debug("Noun Fallback");

          // what is your name
          if (message.dict.containsHLC("identity") && _.contains(message.pronouns, "your")) {
            
            debug("What is My Name?");
            suggest = "It is Brit!";

          } else {
            // what is a <...>?
            for (var i = 0; i < message.concepts.length; i++) {
              if (message.concepts[i].text == message.nouns[0].toLowerCase()) {
                m = message.concepts[i].text;
              }
            }

            if (m) {
              cnet.isAReverse(m, function(err, concepts) {
                if (concepts.length != 0) {
                  var cid = Utils.getRandomInt(0, concepts.length - 1);

                  if (message.qSubType == "YN") {
                    suggest = "Yes, " + concepts[cid].sentense;
                  } else {
                    suggest = concepts[cid].sentense;
                  }
                } else {
                  suggest = "I'm not sure.";
                }
              })
            } else {
              suggest = "I'm not sure.";
            }          
          }

        } else if (message.nouns.length == 0 && message.pnouns.length == 1 && message.verbs.length == 1) {
          // who is he / she
          var candidates = history(user, { nouns: true });
          if (candidates.length != 0) {
            suggest = message.pnouns[0] + " " + message.verbs[0] + " your " + candidates[0].nouns[0];

          } else {
            suggest = "I'm not sure who " + message.pnouns[0] + " " + message.verbs[0] + ".";
          }
          
        } else {
          debug("Fall though");
          suggest = "I'm not sure.";
        }
      }
    }

    break;
  }
  cb(null, suggest);
}