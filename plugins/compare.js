var debug = require("debug")("Compare Plugin");
var history = require("../lib/history");
var Utils = require("../lib/utils");
var _ = require("underscore");
var async = require("async");

exports.createFact = function(s, v, o, cb) {
  var that = this;
  this.user.memory.create(s, v, o, false, function() {
    that.facts.db.get({subject:v,  predicate: 'opposite'}, function(e,r){
      if (r.length != 0) {
        that.user.memory.create(o, r[0].object, s, false, function() {
          cb(null,"");
        });
      } else {
        cb(null,"");
      }
    });
  });
}

exports.resolveAdjective = function(cb) {

  var candidates = history(this.user, { names: true });
  var message = this.message;
  var factsDB = this.user.memory.db;
  var gDB     = this.facts.db;
  var that = this;



  var negatedTerm = function(msg, names, cb) {
    // Are we confused about what we are looking for??!
    // Could be "least tall" negated terms
    if (_.contains(msg.adjectives, "least") && msg.adjectives.length == 2) {

      // We need to flip the adjective to the oppisite and do a lookup.
      var cmpWord = _.without(msg.adjectives,"least");
      getOpp(cmpWord[0], function(err, oppWord) {

        // TODO - What if there is no oppWord?
        // TODO - What if we have more than 2 names?

        debug("Lookup", oppWord, names);
        if (names.length === 2) {
        
          var pn1 = names[0].toLowerCase();
          var pn2 = names[1].toLowerCase();

          factsDB.get({ subject: pn1, predicate: oppWord, object: pn2 }, function(e, r) {
            // r is treated as 'truthy'
            if (!_.isEmpty(r)){
              cb(null, Utils.ucwords(pn1) + " is " + oppWord+"er.");
            } else {
              cb(null, Utils.ucwords(pn2) + " is " + oppWord+"er.");
            }
          });

        } else {
          cb(null, Utils.ucwords(names) + " is " + oppWord+"er.");
        }
      });

    } else {
      // We have no idea what they are searching for
      cb(null, "???");  
    }
  }

  var getOpp = function(term, callback) {
    
    gDB.search({ subject: term, predicate: 'opposite', object: 
      gDB.v('opp')}, function(e, oppResult) {
      if (!_.isEmpty(oppResult)) {
        callback(null, oppResult[0].opp);
      } else {
        callback(null, null);
      }
    });
  }

  // This will return the adjective from the message, or the oppisite term in some cases
  // "least short" => tall
  // "less tall" => short
  var baseWord = null;
  var getAdjective = function(m, cb) {
    var cmpWord;
    
    if (findOne(m.adjectives, ["least", "less"])) {
      cmpWord = _.first(_.difference(m.adjectives, ["least", "less"]));
      baseWord = cmpWord;
      getOpp(cmpWord, cb);
    } else {
      cb(null, (m.compareWords[0]) ? m.compareWords[0] : m.adjectives[0]);
    }
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

      if ((message.compareWords.length === 1 || message.adjectives.length === 1)) {
        
        var handle = function(e, cmpTerms) {
          var compareWord = cmpTerms[0];
          var compareWord2 = cmpTerms[1];

          debug("CMP ", compareWord, compareWord2);

          
          gDB.get({ subject: compareWord, predicate: 'opposite', object: compareWord2}, function(e, oppResult) {

            debug("Looking for Opp of", compareWord, oppResult);

            // Jane is older than Janet. Who is the older Jane or Janet? 
            if (!_.isEmpty(message.names)) {
              debug("We have names", message.names);
              // Make sure we say a name they are looking for.
              var nameOne = message.names[0].toLowerCase()
              
              factsDB.get({ subject: nameOne, predicate: compareWord }, function(e, result) {
                
                if (_.isEmpty(result)) {
                  // So the fact is wrong, lets try the other way round
                  
                  factsDB.get({ object: nameOne, predicate: compareWord}, function(e, result) {
                    debug("RES", result)

                    if (!_.isEmpty(result)) {
                      if (message.names.length === 2 && result[0].subject == message.names[1]) {
                        cb(null, Utils.ucwords(result[0].subject) + " is " + compareWord+"er than " + Utils.ucwords(result[0].object) + ".");
                      } else if (message.names.length === 2 && result[0].subject != message.names[1]) {
                        // We can guess or do something more clever?
                        cb(null, Utils.ucwords(message.names[1]) + " is " + compareWord+"er than " + Utils.ucwords(result[0].object) + ".");  
                      } else {
                        cb(null, Utils.pickItem(message.names) + " is " + compareWord+"er?");
                      }
                      
                    } else {
                      // Lets do it again if we have another name
                      cb(null, Utils.pickItem(message.names) + " is " + compareWord+"er?");
                    }
                  });
                } else {
                  // This could be a <-> b <-> c (is a << c ?)
                  
                  factsDB.search([
                    {subject: nameOne, predicate: compareWord, object: factsDB.v("f") },
                    {subject: factsDB.v("f"), predicate: compareWord, object: factsDB.v("v")}
                  ], function(err, results) {
                    if (!_.isEmpty(results)) {
                      if (results[0]['v'] == message.names[1].toLowerCase()) {
                        cb(null, Utils.ucwords(message.names[0]) + " is " + compareWord + "er than " + Utils.ucwords(message.names[1]) + ".");
                      } else {
                        // Test this
                        cb(null, Utils.ucwords(message.names[1]) + " is " + compareWord + "er than " + Utils.ucwords(message.names[0]) + ".");
                      }
                    } else {
                      // Test this block
                      cb(null, Utils.pickItem(message.names) + " is " + compareWord+"er?");
                    }
                  });
                }
              });

            } else {

              debug("NO NAMES");
              // Which of them is the <adj>?
              // This message has NO names
              // Jane is older than Janet. **Who is the older?**
              // Jane is older than Janet. **Who is the youngest?**

              // We pre-lemma the adjactives, so we need to fetch the raw word from the dict.
              // We could have "Who is the oldest"
              // If the word has been flipped, it WONT be in the dictionary, but we have a cache of it
              var fullCompareWord = (baseWord) ?
                message.dict.findByLem(baseWord).word : 
                message.dict.findByLem(compareWord).word;
              

              // Looking for an end term 
              if (fullCompareWord.indexOf("est") > 0) {
                
                factsDB.search([
                  {subject: 
                    factsDB.v("oldest"), predicate: compareWord, object: 
                    factsDB.v("rand1") },
                  {subject: 
                    factsDB.v("oldest"), predicate: compareWord, object: 
                    factsDB.v("rand2") }
                ], function(err, results) {
                  if (!_.isEmpty(results)) {
                    cb(null, Utils.ucwords(results[0]['oldest']) + " is the " + compareWord + "est.");
                  } else {
                    // Pick one.
                    cb(null, Utils.ucwords(Utils.pickItem(prevMessage.names)) + " is the " + compareWord + "est.");
                  }
                });
              } else {

                if (!_.isEmpty(oppResult)) {
                  // They are oppisite, but lets check to see if we have a true fact
                  
                  factsDB.get({ subject: prevMessage.names[0].toLowerCase(), predicate: compareWord }, function(e, result) {
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

        }

        async.map([message, prevMessage], getAdjective, handle);

      } else {
        negatedTerm(message, prevMessage.names, cb);
      }

    }
  } else {
    cb(null, "??");
  }
  
}

var findOne = function (haystack, arr) {
  return arr.some(function (v) {
    return haystack.indexOf(v) >= 0;
  });
};
