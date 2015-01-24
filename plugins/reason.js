
var debug = require("debug")("Reason Plugin");
var history = require("../lib/history");
var Utils = require("../lib/utils");
var _ = require("underscore");
var moment = require("moment");
var wd = require("../lib/wordnet"); 

exports.hasName = function(bool, cb) {
  this.user.getVar('name', function(e,name){
    if (name !== null) {
      cb(null, (bool == "true") ? true : false)
    } else {
      // We have no name
      cb(null, (bool == "false") ? true : false)
    }
  });
}

exports.has = function(value, cb) {
  this.user.getVar(value, function(e, uvar){
    cb(null, (uvar === undefined) ? false : true);
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
    var too = (message.adverbs.indexOf("too") != -1) ? "too " : "";
    suggest = "The " + choice.pop() + " was " + too + message.adjectives[0] + ".";
    // suggest = "The " + choice.pop() + " was too " + message.adjectives[0] + ".";
  } else {
    suggest = "";
  }

  cb(null, suggest);  
}

exports.usedFor = function(cb) {
  var that = this;
  this.cnet.usedForForward(that.message.nouns[0], function(e,r){
    if (!_.isEmpty(r)) {
      var res = (r) ? Utils.makeSentense(r[0].sentense)  : "";
      cb(null, res);
    } else {
      cb(null,"");
    }
  });
}

exports.resolveFact = function(cb) {
  // Resolve this
  var message = this.message;
  var t1 = message.nouns[0];
  var t2 = message.adjectives[0];

  this.cnet.resolveFact(t1, t2, function(err, res){
    if (res) {
      cb(null, "It sure is.");
    } else {
      cb(null, "I'm not sure.");
    }
  });
}


exports.putA = function(cb) {
  var that = this;
  var thing = (that.message.entities[0]) ? that.message.entities[0] : that.message.nouns[0];
  var userfacts = that.user.memory.db;

  if (thing) {
    this.cnet.putConcept(thing, function(e, putThing){
      if (putThing) {
        cb(null, Utils.makeSentense(Utils.indefiniteArticlerize(putThing)));
      } else {
        cb(null, "");
      }
    });
  }
}

exports.isA = function(cb) {
  var that = this;
  var thing = (that.message.entities[0]) ? that.message.entities[0] : that.message.nouns[0];
  var userfacts = that.user.memory.db;
  var userID = that.user.name;

  if (thing) {
    this.cnet.isAForward(thing, function(e,r){
      if (!_.isEmpty(r)) {
        var res = (r) ? Utils.makeSentense(r[0].sentense)  : "";
        cb(null, res);
      } else {
        // Lets try wordnet
        wd.define(thing, function(err, result){
          if (err) {
            cb(null, "");
          } else {
            cb(null, result);
          }          
        });
      }
    });
  } else {
    var thing = "";
    // my x is adj => what is adj
    if (that.message.adverbs[0]) {
      thing = that.message.adverbs[0];
    } else {
      thing = that.message.adjectives[0];
    }
    userfacts.get({object:thing, predicate: userID}, function(err, list) {
      if (!_.isEmpty(list)){
        // Because it came from userID it must be his
        cb(null, "You said your " + list[0].subject + " is " + thing + ".");
      } else {
        // find example of thing?
        cb(null, "");
      }      
    });
  }
}

exports.colorLookup = function(cb) {
  var that = this;
  var message = this.message;
  var things = message.entities.filter(function(item) { if (item != "color") return item; });
  var suggest = "";
  var facts = that.facts.db;
  var userfacts = that.user.memory.db;
  var botfacts = that.botfacts.db;
  var userID = that.user.name;

  // TODO: This could be improved adjectives may be empty
  var thing = (things.length == 1) ? things[0] : message.adjectives[0];

  if(thing != "" && message.pnouns.length == 0) {

    // What else is green (AKA Example of green) OR
    // What color is a tree?

    var fthing = thing.toLowerCase().replace(" ", "_");

    // ISA on thing
    facts.get({ object: fthing, predicate:'color'}, function(err, list) {
      if (!_.isEmpty(list)) {
        var thingOfColor = Utils.pickItem(list);
        var toc = thingOfColor.subject.replace(/_/g, " ");  

        cb(null, Utils.makeSentense(Utils.indefiniteArticlerize(toc) + " is " + fthing));
      } else {
        facts.get({ subject: fthing, predicate:'color'}, function(err, list) {
          if (!_.isEmpty(list)) {
            suggest = "It is " + list[0].object + ".";
            cb(null, suggest);
          } else {

            that.cnet.resolveFact("color", thing, function(err, res){
              if (res) {
                suggest = "It is " + res + ".";
              } else {
                suggest = "It depends, maybe brown?";
              }
              cb(null, suggest);
            });
          }
        });
      }
    });

  } else if (message.pronouns.length != 0){
    // Your or My color?
    // TODO: Lookup a saved or cached value.
    
    // what color is my car
    // what is my favoirute color
    if (message.pronouns.indexOf("my") != -1) {

      // my car is x
      userfacts.get({subject:message.nouns[1],  predicate: userID}, function(err, list) {
        
        if (!_.isEmpty(list)) {
          var color = list[0].object;
          var lookup = message.nouns[1];
          var toSay = ["Your " + lookup + " is " + color + "."]

          facts.get({object:color,  predicate: 'color'}, function(err, list) {
            if (!_.isEmpty(list)) {
              var thingOfColor = Utils.pickItem(list);
              var toc = thingOfColor.subject.replace(/_/g, " ");  
              toSay.push("Your " + lookup + " is the same color as a " + toc + ".");
            }
            cb(null, Utils.pickItem(toSay));
          });
        } else {
          // my fav color - we need 
          var pred = message.entities[0];
          userfacts.get({subject: thing,  predicate: pred }, function(err, list) {
            debug("!!!!", list)
            if (!_.isEmpty(list)) {
              var color = list[0].object;
              cb(null,"Your " + thing + " " + pred + " is " + color + ".");
            } else {
              cb(null,"You never told me what color your " + thing + " is.");  
            }
          });
          
        }
      });      
    } else if (message.pronouns.indexOf("your") != -1) {
      // Do I have a /thing/ and if so, what color could or would it be?
      
      botfacts.get({subject:thing, predicate: 'color'}, function(err, list) {
        if (!_.isEmpty(list)) {
          var thingOfColor = Utils.pickItem(list);
          var toc = thingOfColor.object.replace(/_/g, " ");
          cb(null, "My " + thing + " color is " + toc + ".");
        } else {
          debug("---", {subject:thing, predicate: 'color'})
          // Do I make something up or just continue?
          cb(null, "");
        }
      });
    }
  } else {
    suggest = "It is blue-green in color.";
    cb(null, suggest);
  }
}

exports.makeChoice = function(cb) {
  var that = this;
  if (!_.isEmpty(that.message.list)) {
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
    
  } else {
    cb(null,"")
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

exports.locatedAt = function(cb) {
  debug("LocatedAt");
  var args = Array.prototype.slice.call(arguments);
  var place;

  if (args.length === 2) {
    place = args[0];
    cb = args[1];
  } else {
    cb = args[0];
    // Pull the place from the history
    var reply = this.user.getLastReply();
    if (reply && reply.nouns.length != 0);
    place = reply.nouns.pop();
  }
   
  // var thing = entities.filter(function(item){if (item != "name") return item })
  this.cnet.atLocationReverse(place, function(err, results){
    if (!_.isEmpty(results)) {
      var itemFound = Utils.pickItem(results);
      cb(null,Utils.makeSentense("you might find " + Utils.indefiniteArticlerize(itemFound.c1_text) + " at " +  Utils.indefiniteArticlerize(place)));
    } else {
      cb(null,"");  
    }
    
  });
}

exports.aquireGoods = function(cb) {
  // Do you own a <thing>
  var that = this;
  var message = that.message;
  var thing = (message.entities[0]) ? message.entities[0] : message.nouns[0];
  var botfacts = that.botfacts.db;
  var cnet = that.cnet;
  var reason = "";

  botfacts.get({subject:thing, predicate: 'ownedby', object: 'bot'}, function(err, list) {
    debug("!!!", list)
    if (!_.isEmpty(list)){
      // Lets find out more about it.

      cb(null, "Yes");
    } else {
      // find example of thing?
      // what is it?
      cnet.usedForForward(thing, function(err, res){
         
        if (res) {
          reason = Utils.pickItem(res);
          reason = reason.frame2;
          botfacts.put({subject:thing, predicate: 'ownedby', object: 'bot'}, function(err, list) {
            cb(null, "Yes, I used it for " + reason + ".");  
          });
        } else {
          cb(null, "NO");    
        }
      })
    }    
  });
}
