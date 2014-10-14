var debug   = require("debug")("AutoReply:DescReply");
var _       = require("underscore");
var history = require("../history");
var Utils   = require("../utils");
var isa     = require("./isaLookup");
var roman   = require('roman-numerals');

module.exports = function(message, facts, cnet, user, cb) {

  var parts = message.qtype.split(":");
  var fine = parts[1];

  var suggest = "";

  switch (fine) {
    case "manner":
      // How is the ...
      suggest = "humm.. not sure.";
      cb(null, suggest);
    break;
    case "reason":
    case "def":
      // What is 1000 in roman numeral ?
      if (message.nouns.indexOf("roman") != -1 && message.nouns.indexOf("numeral") != -1 && message.numbers.length == 1) {
        suggest = "I think it is " + roman.toRoman(message.numbers[0]);
        cb(null, suggest);
        break;
      }

      // What is 1000 in binary?
      if ((message.nouns.indexOf("binary") != -1 || message.adjectives.indexOf("binary") != -1) && message.numbers.length == 1) {
        suggest = "I think it is " + parseInt(message.numbers[0], 10).toString(2);
        cb(null, suggest);
        break;
      }

      // What is 1000 in hex?
      if ((message.nouns.indexOf("hex") != -1 || message.adjectives.indexOf("hex") != -1) && message.numbers.length == 1) {
        suggest = "I think it is " + parseInt(message.numbers[0], 10).toString(16);
        cb(null, suggest);
        break;
      }

    case "desc":
      if (message.verbs.indexOf("put") != -1) {
        if (message.nouns.length != 0) {
          // TODO figure out which noun to use.
          var putNouns = message.nouns.filter(function(item) { if (item != "use") return item;})[0];
          cnet.putConcept(putNouns, function(err, res){
            if (res) {
              suggest = "I would use a " + res;
            } else {
              suggest = "humm.. not sure.";
            }
            cb(null, suggest);
          });
        } else {
          suggest = "humm.. not sure.";
          cb(null, suggest);
        }

      } else {
        // 
        if (_.contains(message.lemWords, "do")) {
          debug("Do MSG", message);
          // DO
          
          // Do you have any hobbies? - Moved to Self.js
          // What would I do with x?
          if (_.contains(message.lemWords, "with")) {
            isa(user, message, facts, cnet, function(err, suggestedReply) {
              debug("Suggesting", suggestedReply);
              cb(null, suggestedReply);
            });
          } else {
            // What do I like to do? (Jump rope, Play tennis)
            // What do I have? ()            
            var candidates = history(user, { nouns: message.nouns });

            // Answer types is WHAT, the answer is in the cnouns
            if (candidates.length != 0 && candidates[0].cNouns.length != 0) {
              debug("do - candidates", candidates[0]);
              var choice = candidates[0].cNouns.filter(function(item){ return item.length >= 3 });
              
              if (_.contains(message.verbs, "have")) {
                suggest = "You have " + Utils.indefiniteList(choice) + ".";
              } else {
                if  (candidates[0].verbs.length == 1) {
                  suggest = candidates[0].verbs[0] + " " + choice[0] + ".";
                } else {
                  suggest = "The " + choice[0] + ".";
                }                    
              }
              cb(null, suggest);
            } else {
              suggest = "";
              cb(null, suggest);
            }
          }
        

        } else if (_.contains(message.lemWords, "can")) {
          
          // We are doing what "CAN" Modal Verb
          // For this we slice everything afte can
          var index = message.lemWords.indexOf("can");
          var thing = message.cwords.slice(index + 1);
          thing = thing.join(" ");
          debug("Can / capableOf with", thing);
          cnet.capableOfReverse(thing, function(err, res){
            var can = _.filter(res, function(item){
              if (item.sentense.indexOf("not") < 0 && item.sentense.indexOf("can't") < 0 && item.sentense.indexOf("don't") < 0) {
                return true;
              }
            });

            var choice = can.map(function(item) { return item.sentense });
            if (choice) {
              suggest = Utils.pickItem(choice);
            } else {
              suggest = "I'm not sure.";
            }
            cb(null, suggest);
          });
        } else {

          if (_.contains(message.pnouns, "them") && message.nouns.length == 0 && message.adjectives.length != 0) {
            // This is probaby a missplaced question.
            // No nouns, and a pronoun and an adjective, we need to pull 
            // names from the history and see if we have a local fact

            var w = message.adjectives[0];
            var ind = message.words.indexOf(w);
            var lemCmpWord = message.lemWords[ind];
            var memory = user.memory;

            var candidates = history(user, { names: true });
            var names = [];
            if (candidates.length != 0) {
              for (var i = 0; i < candidates.length; i++) {
                names = names.concat(candidates[i].names);
              }
            }

            var model = [];
            for (var i = 0; i < names.length; i++) {
              var item = memory.query("direct_sv", names[i], lemCmpWord);
              model.push({name: names[i], num: item.length });
            }

            var winner = _.max(model, function(items){ return items.num });
            suggest = winner.name + " is the " + w;
            cb(null, suggest);
          } else if (_.contains(message.pnouns, "it") && message.nouns.length == 0){
            // We have a little info, and a pronoun "it" as in
            // What was it
            // We are looking for a noun
            var candidates = history(user, { nouns: true });
            
            if (candidates.length != 0) {
              suggest = Utils.pickItem(candidates[0].nouns);
            } else {
              suggest = "I'm not sure.";
            }
            cb(null, suggest);
          } else if (_.contains(message.pnouns, "we") && message.nouns.length == 0){
            // Shall we [VERB]
            // Do I know or like this verb?
            if (message.verbs.length != 0) {
              if (message.qSubType == "YN") {
                suggest = "Ya, that sounds like fun!";
              } else {
                suggest = "That sounds like fun!";
              }
            } else {
              suggest = "Okay";
            }
            cb(null, suggest);
          } else if (_.contains(message.nouns, "i")) {
            // what am I wearing?
            var candidates = history(user, { nouns: message.nouns });
            debug("I candidates", candidates)

            if (candidates.length != 0 && candidates[0].cNouns.length != 0) {
              var choice = candidates[0].cNouns.filter(function(item){ return item.length >= 3 });                   
              suggest = Utils.indefiniteList(choice) + ".";
            } else {
              suggest = "";
            }
            cb(null, suggest);
          } else if (message.adjectives.length != 0) {
            // what is/was too small?
            var candidates = history(user, { adjectives: message.adjectives });
            debug("adj candidates", candidates);

            if (candidates.length != 0 && candidates[0].cNouns.length != 0) {
              var choice = candidates[0].cNouns.filter(function(item){ return item.length >= 3 });                   
              suggest = "The " + choice.pop() + " was too " + message.adjectives[0] + ".";
            } else {
              suggest = "";
            }

            cb(null, suggest);
          } else {
            // IS A / Used For
            isa(user, message, facts, cnet, function(err, suggestedReply) {
              debug("Suggesting", suggestedReply);
              cb(null, suggestedReply);
            });                  
          }
        }
      }
    break;
  }
}