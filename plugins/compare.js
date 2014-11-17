var debug = require("debug")("Compare Plugin");
var history = require("../lib/history");
var Utils = require("../lib/utils");
var _ = require("underscore");
var async = require("async");

exports.createFact = function(s, v, o, cb) {
  this.facts.create(s, v, o, true, function() {
    cb(null, "");
  });
}

exports.resolveAdjective = function(cb) {

  var candidates = history(this.user, { names: true });
  var message = this.message;
  var that = this;

  var getOpp = function(term, callback) {
    that.facts.db.search({ subject: term, predicate: 'opposite', object: that.facts.db.v('opp')}, function(e, oppResult) {
      if (!_.isEmpty(oppResult)) {
        callback(null, oppResult[0].opp);
      } else {
        callback(null, null);
      }
    });
  }

  // We may want to roll though all the candidates?!?
  // These examples are somewhat forced. (over fitted)
  if (candidates) {
    var prevMessage = candidates[0];

    if (prevMessage.names.length === 1) {

      cb(null, "It is " + prevMessage.names[0] + ".");

    } else if (prevMessage.names.length > 1) {
    
      // This could be:
      // Jane is older than Janet. Who is the youngest?
      // Jane is older than Janet. Who is the younger A or B?
      // My parents are John and Susan. What is my mother called?

      if ((message.compareWords.length == 1 || message.adjectives.length == 1)) {
        
            var compareWord = (message.compareWords[0]) ? message.compareWords[0] : message.adjectives[0];
    var compareWord2 = (prevMessage.compareWords[0]) ? prevMessage.compareWords[0] : prevMessage.adjectives[0];

    debug(" CMP ", compareWord, compareWord2);

    that.facts.db.get({ subject: compareWord, predicate: 'opposite', object: compareWord2}, function(e, oppResult) {          

      // Jane is older than Janet. Who is the older Jane or Janet? 
      if (!_.isEmpty(message.names)) {
        // Make sure we say a name they are looking for.
        var nameOne = message.names[0].toLowerCase()
        that.facts.db.get({ subject: nameOne, predicate: compareWord }, function(e, result) {
          
          if (_.isEmpty(result)) {
            // So the fact is wrong, lets try the other way round
            that.facts.db.get({ predicate: compareWord,  object: nameOne }, function(e, result) {
              if (!_.isEmpty(result)) {
                cb(null, Utils.ucwords(result[0].subject) + " is " + compareWord+"er than " + Utils.ucwords(result[0].object) + ".");
              } else {
                // We really don't know pick one?
                cb(null, Utils.pickItem(message.names) + " is " + compareWord+"er?");
              }
            });
          } else {
            // This could be a <-> b <-> c (is a << c ?)
            that.facts.db.search([
              {subject: nameOne, predicate: compareWord, object: that.facts.db.v("f") },
              {subject: that.facts.db.v("f"), predicate: compareWord, object: that.facts.db.v("v")}
            ], function(err, results) {
              if (!_.isEmpty(results)) {
                if (results[0]['v'] == message.names[1].toLowerCase()) {
                  cb(null, Utils.ucwords(message.names[0]) + " is " + compareWord + "er than " + Utils.ucwords(message.names[1]) + ".");
                } else {
                  // Test this
                  cb(null, Utils.ucwords(message.names[1]) + " is " + compareWord + "er than " + Utils.ucwords(message.names[0]) + ".");
                }
              } else {
                // Test this
                cb(null, "@@@@@@")
              }
            });
          }
        });

      } else {
        // Which of them is the <adj>?
        // This message has NO names
        // Jane is older than Janet. **Who is the older?**
        // Jane is older than Janet. **Who is the youngest?**

        // We pre-lemma the adjactives, so we need to fetch the raw word from the dict.
        // We could have "Who is the oldest"
        
        var fullCompareWord = message.dict.findByLem(compareWord).word;
        
        // Looking for an end term 
        if (fullCompareWord.indexOf("est") > 0) {
          that.facts.db.search([
            {subject: that.facts.db.v("oldest"), predicate: compareWord, object: that.facts.db.v("rand1") },
            {subject: that.facts.db.v("oldest"), predicate: compareWord, object: that.facts.db.v("rand2") }
          ], function(err, results) {
            if (!_.isEmpty(results)) {
              cb(null, Utils.ucwords(results[0]['oldest']) + " is the " + fullCompareWord + ".");
            } else {
              // Pick one.
              cb(null, Utils.ucwords(Utils.pickItem(prevMessage.names)) + " is the " + fullCompareWord + ".");
            }
          });
        } else {

          if (!_.isEmpty(oppResult)) {
            // They are oppisite, but lets check to see if we have a true fact
            that.facts.db.get({ subject: prevMessage.names[0].toLowerCase(), predicate: compareWord }, function(e, result) {
              if (!_.isEmpty(result)) {
                if (message.qSubType == "YN") {
                  cb(null, "Yes, " + Utils.ucwords(result[0].object) + " is " + compareWord+"er.")
                } else {
                  cb(null, Utils.ucwords(result[0].object) + " is " + compareWord+"er than " + prevMessage.names[0] + ".")                      
                }
              } else {
                if (message.qSubType == "YN") {
                  cb(null, "Yes, " + Utils.ucwords(prevMessage.names[1]) + " is " + compareWord+"er.");
                } else {
                  cb(null, Utils.ucwords(prevMessage.names[1]) + " is " + compareWord+"er than " + prevMessage.names[0] + ".");
                }
              }
            });
          } else if (compareWord == compareWord2) {
            // They are the same adjectives
            // No names.
            if (message.qSubType == "YN") {
              cb(null, "Yes, " + Utils.ucwords(prevMessage.names[0]) + " is " + compareWord+"er.");
            } else {
              cb(null, Utils.ucwords(prevMessage.names[0]) + " is " + compareWord+"er than " + prevMessage.names[1] + ".");  
            }
            
          } else {
            // not opposite terms.
            cb(null, "Those things don't make sense to compare.");
          }
        }
      }
    
    });

      } else {
        
        // Are we confused about what we are looking for??!
        // Could be "least tall"
        if (_.contains(message.adjectives,"least") && message.adjectives.length == 2) {

          debug("Lets flip the adjectives with its oppisite and try again.");
          var cmpWord = _.without(message.adjectives,"least");
          getOpp(cmpWord[0], function(err, oppWord) {

            var compareWord = oppWord;
            // I may or may not have a cmp word in the previous message, but I should have some names somewhere...
            var compareWord2 = (prevMessage.compareWords[0]) ? prevMessage.compareWords[0] : prevMessage.adjectives[0];

            if (prevMessage.names.length === 2) {
              debug("Lookup", compareWord, prevMessage.names);
              
              var pn1 = prevMessage.names[0].toLowerCase();
              var pn2 = prevMessage.names[1].toLowerCase();
              that.facts.db.get({ subject: pn1, predicate: compareWord, object: pn2 }, function(e, r){
                if (!_.isEmpty(r)){
                  cb(null, Utils.ucwords(pn1) + " is " + compareWord+"er.");
                } else {
                  cb(null, Utils.ucwords(pn2) + " is " + compareWord+"er.");
                }
              });
            

            } else {

              cb(null, Utils.ucwords(prevMessage.names) + " is " + compareWord+"er.");
            }
            
          });

        } else {

          // We have no idea what they are searching for
          cb(null, "???");  
        }
      }

    }
  } else {
    cb(null, "??");
  }
  
}