var debug   = require("debug")("AutoReply:EntyReply");
var _       = require("underscore");
var history = require("../history");
var Utils   = require("../utils");


module.exports = function(message, facts, cnet, user, cb) {

  var parts = message.qtype.split(":");
  var fine = parts[1];

  var suggest = "";

  switch (fine) {
    case "color":
      var things = message.nouns.filter(function(item) { if (item != "color") return item; });

      // TODO: This could be improved adjectives may be empty
      var thing = (things.length == 1) ? things[0] : message.adjectives[0];

      if(thing != "" && message.pnouns.length == 0) {

        var colorFact = facts.query("direct_sv", thing, "color" );
        debug("ColorFact", colorFact)
        if (colorFact && colorFact.length == 1) {
          suggest = "It is " + colorFact[0] + ".";
        } else {
          cnet.resolveFact("color", thing, function(err, res){
            if (res) {
              suggest = "It is " + res + ".";
            } else {
              suggest = "It depends, maybe brown?";
            }
          });
        }
      } else if (message.pnouns.length != 0){
        // Your or My color?
        // TODO: Lookup a saved or cached value.
        debug("TODO: Lookup a saved or cached value.")
        suggest = "It is blue-green in color.";
      } else {
        suggest = "It is blue-green in color.";
      }
    break;
    case "sport": 
      // WH Sport!
      var candidates = history(user, { nouns: message.nouns });
      if (candidates.length != 0) {
        cnet.resolveFacts(candidates[0].cNouns, "sport", function(err, result) {
          if (result) {
            suggest = "Yes, " + result[0];
          } else {
            suggest = "I'm not sure.";
          }
        });
      } else {
        suggest = "I'm not sure.";
      }

    break;
    case "animal":
      debug("Animal", message)

      // my animal
      if (message.pnouns.indexOf("my") != -1 && 
        (message.verbs.indexOf("called") != -1 || message.verbs.indexOf("named") != -1)) {
        var candidates = history(user, { nouns: message.nouns });
        var animal = message.cNouns.filter(function(item){ return item.length >= 3 });

        if (candidates.length != 0 && candidates[0].names.length != 0) {
          suggest = candidates[0].names[0];
        } else {
          suggest = "I'm not sure what your " + animal[0] + " is " + message.verbs[0];
        }
      } else if (message.nouns.length == 2) {
        cnet.resolveFact(message.cNouns[0], "animal", function(err, result) {
          if (result) {
            suggest = "Yes, " + result;
          } else {
            suggest = "I'm not sure.";
          }
        });    
      } else {
        suggest = "I'm not sure.";
      }

    break;
    case "food": 
      var candidates = history(user, { nouns: message.nouns });
      if (candidates.length != 0) {
        cnet.resolveFacts(candidates[0].cNouns, "food", function(err, result) {
          if (result) {
            suggest = "Yes, " + result[0];
          } else {
            suggest = "I'm not sure.";
          }
        });
      } else {
        suggest = "I'm not sure.";
      }
    break;
    case "lang": 
      if ((_.contains(message.verbs, "speak") || _.contains(message.verbs, "spoken") ||  _.contains(message.verbs, "speaking")) && message.names.length != 0) {
        var lang = facts.query("direct_vo", "language",  message.names[0]);  
        if (lang) {
          suggest = "People speak " + lang[0] + " in " + message.names[0];
        } else {
          suggest = "I'm not sure what language is spoken in " + message.names[0];
        }
      } else {
        suggest = "I'm not sure.";
      }
    break;
    case "other":
    case "product":
      if (message.nouns.length != 0 && message.concepts.length != 0) {
        for (var i = 0; i < message.concepts.length; i++) {
          if (message.concepts[i].text == message.nouns[0].toLowerCase()) {
            m = message.concepts[i].text;
          }
        }

        if (m) {
          debug("Concept Found", m);
          cnet.isAForward(m, function(err, concepts) {
            if (concepts.length != 0) {
              var cid = Utils.getRandomInt(0, concepts.length - 1);

              if (message.qSubType == "YN") {
                suggest = "Yes, " + concepts[cid].sentense;
              } else {
                suggest = concepts[cid].sentense;
              }
            } else {
              if (message.qSubType == "YN") {
                suggest = "I have no idea what " + message.names[0] + " is.";
              } else {
                suggest = "I'm not sure.";
              }
            }
          })
        }
      }
    break;
    default:
      debug("Fall though all ENTY", message);
      suggest = "";
  }

  cb(null, suggest);
}