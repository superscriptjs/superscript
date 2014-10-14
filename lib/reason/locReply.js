var debug   = require("debug")("AutoReply:LocReply");
var _       = require("underscore");
var history = require("../history");
var Utils   = require("../utils");

module.exports = function(message, facts, cnet, user, cb) {

  var parts = message.qtype.split(":");
  var fine = parts[1];

  var suggest = "";

  switch (fine) {
    case "country":
      suggest = "Canada!";
    break;
    case "city":
      if (message.nouns.length == 3 && _.contains(message.nouns, "country") && _.contains(message.nouns, "capital")) {
        var place = message.nouns.filter(function(item) { if (item != "capital" && item != "country") return item; });
        var country = facts.query("direct_sv", place[0], "part");  
        debug("capitals", country);
        if (country.length != 0) {
          suggest = place + " is the capital of " + country[0];
        } else {
          suggest = "Vancouver?";
        }

      } else {
        var things = message.nouns.filter(function(item) { if (item != "capital") return item; });
        var place = (things.length == 1) ? things[0] : (message.adverbs.length != 0) ? message.adverbs[0] : null;
        if (place) {
          var capitals = facts.query("direct_sv", place, "part_op");  
          debug("capitals", capitals);
          if (capitals.length != 0) {
            var rep = "";
            if (message.qSubType == "YN") {
              rep = "Yes, the capital of " + place + " is " + capitals[0] + ".";  
            } else {
              rep = "The capital of " + place + " is " + capitals[0] + ".";
            }
            suggest = rep;

          } else {
            suggest = "Vancouver?";
          }
        } else {
          suggest = "Vancouver?";
        }
      }

    break;
    case "mount":
      suggest = "Rockies";
    break;
    case "other": 
      // lake or river?

      if (_.contains(message.lemWords, "locate") || _.contains(message.lemWords, "location")) {
        debug("Looking for something")
        if (message.names.length == 1) {
          suggest = "I don't know where the " + message.names[0] + " is located.";
        } else {
          suggest = "I don't know where that is.";
        }
      } else if (message.names.length != 0) {
        // Where is earth?
        cnet.atLocationForward(message.names[0], function(err, res) {

          // TODO - IN callback HERE, we need to Callback

          if (res) {
            var c = Utils.pickItem(res);
            suggest = c.sentense;
          } else {
            suggest = "I don't know where that is.";
          }
        });
      } else if (_.contains(message.lemWords, "near") && message.nouns.length == 1) {
        // We should have this fact.

        var country = facts.query("direct_sv", message.nouns[0], "adjacent");
        debug("Adj", country);
        if (country.length != 0) {
          suggest = message.nouns[0] + " is near " + country[0];
        } else {
          suggest = "No idea";
        }

      } else if(message.dict.containsHLC("acquire_imperatives") || message.dict.containsHLC("buy")) {

        if(message.dict.containsHLC("objects")) {                
          var cc = message.dict.get(message.nouns[0]).hlc;
          debug("Concept", cc)

          var store = _.find(cc, function(item) { return item.indexOf("store") != -1; })

          if (store) {
            var sn = Utils.indefiniteArticlerize(store.replace("_"," "));
            suggest = "How about in " + sn + ".";
          } else {
            // Cycle though the cc and see if we can get a store
            var store2 = false;
            for (var i = 0; i < cc.length;i++) {
              var inlinefacts = facts.query("direct_sv", cc[i], "isa")
              store2 = _.find(inlinefacts, function(item) { return item.indexOf("store") != -1; })
              if (store2) break;
            }
            if (store2) {
              var sn = Utils.indefiniteArticlerize(store2.replace("_"," "));
              suggest = "How about in " + sn + ".";
            } else {
              suggest = "No idea.";
            }
          }
        } else {
          suggest = "No idea";
        }
      } else {

        // Where do you live?
        if (message.dict.containsHLC("live") ) {
          
          if (_.contains(message.pronouns, "your") || _.contains(message.pronouns, "you")) {
            debug("Live, YOU")
            var loc = facts.query("direct_sv", "live", "botProp");
            if (!_.isEmpty(loc)) {
              suggest = "I live in " + Utils.ucwords(loc[0]) + ".";
            } else {
              suggest = "I've lived all over.";
            }
          } else if(_.contains(message.lemWords, "i") || _.contains(message.pronouns, "my")) {
            
            // Check the history
            var candidates = history(user, { names: true });
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
              
            }
          } else {
            suggest = "You can almost live anywhere.";
          }

        } else {
          suggest = "Lake Ontario or Fraser River?";  
        }
      }
      
    break;
    default:
      debug("Fall though all LOC", message);
      suggest = "Vancouver BC.";
  }

  cb(null, suggest);
}