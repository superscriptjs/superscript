/*global Reply,Topic,Gambit */
/**

  Topics are a grouping of gambits.
  The order of the Gambits are important, and a gambit can live in more than one topic.

**/

var natural = require("natural");
var _ = require("underscore");
var async = require("async");
var regexreply = require("../parse/regexreply");
var findOrCreate = require("mongoose-findorcreate");
var debug = require("debug")("Topics");
var Utils = require("../utils");
var Sort = require("./sort");

var TfIdf = natural.TfIdf;
var tfidf = new TfIdf();

module.exports = function (mongoose) {

  natural.PorterStemmer.attach();

  var topicSchema = new mongoose.Schema({
    name: {type: String, index: true, unique: true},
    keep: {type: Boolean, default: false },
    system: {type: Boolean, default: false},
    filter: {type: String, default: ""},
    keywords: {type: Array},
    gambits: [{ type: String, ref: "Gambit"}]
  });

  topicSchema.pre("save", function (next) {
    var self = this;
    var kw;

    if (!_.isEmpty(this.keywords)) {
      kw = self.keywords.join(" ");
      if (kw) {
        tfidf.addDocument(kw.tokenizeAndStem(), self.name);
      }
    }
    next();
  });


  // This will create the Gambit and add it to the model
  topicSchema.methods.createGambit = function (gambitData, callback) {
    if (!gambitData) {
      return callback("No data");
    }

    var gambit = new Gambit(gambitData);
    var self = this;
    gambit.save(function (err) {
      if (err) {
        return callback(err);
      }
      self.gambits.addToSet(gambit._id);
      self.save(function (err2) {
        callback(err2, gambit);
      });
    });
  };

  topicSchema.methods.sortGambits = function (callback) {
    var self = this;
    var expandReorder = function (gambitId, cb) {
      Gambit.findById(gambitId, function (err, gambit) {
        if (err) {
          console.log(err);
        }

        cb(null, gambit);
      });
    };

    async.map(self.gambits, expandReorder, function (err, newGambitList) {
      if (err) {
        console.log(err);
      }

      var newList = Sort.sortTriggerSet(newGambitList);
      self.gambits = newList.map(function (g) {
        return g._id;
      });
      self.save(callback);
    });
  };

  topicSchema.methods.findMatch = function (message, user, plugins, scope, callback) {
    debug("FindMatch", this.name);
    var eachGambitHandle;
    var eachGambit;
    var self = this;
    var matches = [];
    var filterRegex = /\s*\^(\w+)\(([\w<>,\|\s]*)\)\s*/i;

    // This will find all the gambits to process by parent (topic or conversation)
    eachGambit = function(type, id) {
      // Lets Query for Gambits
      // TODO - Pass in match options

      var execHandle = function(err, mgambits) {
        var populateGambits = function (gambit, cb) {
          Reply.populate(gambit, {path: "replies"}, cb);
        };

        async.each(mgambits.gambits, populateGambits, function populateGambitsComplete (err2) {
          if (err2) {
            console.log(err2);
          }
          async.each(mgambits.gambits, eachGambitHandle, function eachGambitHandleComplete () {
            callback(null, matches);
          });
        });
      };

      if (type === "topic") {
        debug("Looking back Topic", id);
        Topic.findOne({_id: id}, "gambits")
          .populate("gambits")
          .exec(execHandle);
      } else {
        debug("Looking back at Conversation", id);
        Reply.findOne({_id: id}, "gambits")
         .populate("gambits")
         .exec(execHandle);
      }
    };


    // This is the main function that looks for a matching entry
    eachGambitHandle = function (trigger, callback) {

      var match = false;
      var stars = [];

      regexreply.postParse(trigger.trigger, message, user, function complexFunction(regexp) {
        var pattern = new RegExp("^" + regexp + "$", "i");

        debug("Try to match (clean)'" + message.clean + "' against " +
          trigger.trigger + " (" + regexp + ") topic: " + self.name);
        debug("Try to match (lemma)'" + message.lemString + "' against " +
          trigger.trigger + " (" + regexp + ") topic: " + self.name);

        if (trigger.isQuestion && message.isQuestion) {
          if (trigger.qSubType !== false) {
            // WH, CH, YN TG
            if (message.qSubType === trigger.qSubType) {
              match = message.clean.match(pattern);
              if (!match) {
                match = message.lemString.match(pattern);
              }
            }
            // NUM etc.
            if (message.qtype.indexOf(trigger.qType) !== -1) {
              match = message.clean.match(pattern);
              if (!match) {
                match = message.lemString.match(pattern);
              }
            }
          } else {
            // NUM etc.
            if (message.qtype.indexOf(trigger.qType) !== -1) {
              debug("QType Match", trigger.qType, message.qtype);
              match = message.clean.match(pattern);
              if (!match) {
                match = message.lemString.match(pattern);
              }
            } else if (trigger.qType === false) {
              // Do we have a question?
              match = message.clean.match(pattern);
              if (!match) {
                match = message.lemString.match(pattern);
              }
            }
          }

        } else if (!trigger.isQuestion && !trigger.qType) {
          match = message.clean.match(pattern);
          if (!match) {
            match = message.lemString.match(pattern);
          }
        }

        if (match) {
          if (trigger.filter !== "") {
            // We need scope and functions
            debug("We have a filter function", trigger.filter);

            var filterFunction = trigger.filter.match(filterRegex);
            debug("Filter Function Found", filterFunction);

            var pluginName = Utils.trim(filterFunction[1]);
            var partsStr = Utils.trim(filterFunction[2]);
            var parts = partsStr.split(",");

            var args = [];
            for (var i = 0; i < parts.length; i++) {
              if (parts[i] !== "") {
                args.push(parts[i].trim());
              }
            }

            if (plugins[pluginName]) {
              args.push(function customFilterFunctionHandle(err, filterReply) {
                if (err) {
                  console.log(err);
                }

                if (filterReply === "true" || filterReply === true) {
                  debug("filterReply", filterReply);

                  if (trigger.redirect !== "") {
                    debug("Found Redirect Match with topic " + self.name);
                    Topic.findTriggerByTrigger(trigger.redirect, function (err2, gambit) {
                      if (err2) {
                        console.log(err2);
                      }

                      trigger = gambit;
                      callback();
                    });

                  } else {
                    debug("Found Match with topic " + self.name);
                    if (match.length > 1) {
                      for (var j = 1; j < match.length; j++) {
                        if (match[j]) {
                          stars.push(Utils.trim(match[j]));
                        }
                      }
                    }

                    matches.push({stars: stars, trigger: trigger, topic: self.name});
                    callback();
                  }
                } else {
                  debug("filterReply", filterReply);
                  callback();
                }
              });

              debug("Calling Plugin Function", pluginName);
              plugins[pluginName].apply(scope, args);

            } else {
              debug("Custom Filter Function not-found", pluginName);
              callback();
            }
          } else {

            var afterHandle = function (cb) {
              debug("Found Match with topic " + self.name);
              if (match.length > 1) {
                for (var j = 1; j < match.length; j++) {
                  if (match[j]) {
                    stars.push(Utils.trim(match[j]));
                  }
                }
              }

              // Tag the message with the found Trigger we matched on
              message.gambitId = trigger._id;
              debug("Updating Message Object with Trigger Match", message.gambitId);
              matches.push({stars: stars, trigger: trigger, topic: self.name});
              cb();
            };

            if (trigger.redirect !== "") {
              debug("Found Redirect Match with topic ", self.name);
              Topic.findTriggerByTrigger(trigger.redirect, function (err, gambit) {
                if (err) {
                  console.log(err);
                }

                debug("Redirecting to New Gambit", gambit);
                trigger = gambit;
                afterHandle(callback);
              });
            } else {
              afterHandle(callback);
            }
          }
        } else {
          callback();
        }

      }); // end regexReply
    }; // end EachGambit



    // =======================================
    // This is the entry point to the function
    // Search for previous match
    // var lastReply = user.__history__.reply[0];

    // // TODO: we also want to see when the last message was sent
    // if (!_.isEmpty(lastReply)) {
    //   var replyId = lastReply.replyId;
    //   debug("Last reply: ", lastReply.raw, replyId);
    //   Reply.findOne({id: replyId, gambits: {$not: {$size: 0}}})
    //     .populate("gambits")
    //     .exec(function (err, mgambits) {
    //       if (err) {
    //         console.log(err);
    //       }

    //       var iter = function (gambit, cb) {
    //         Reply.populate(gambit, {path: "replies"}, cb);
    //       };

    //       if (mgambits) {
    //         debug("Found", mgambits);
    //         async.each(mgambits.gambits, iter, function done(err) {
    //           async.each(mgambits.gambits, eachGambitHandle, function eachGambitHandleComplete() {
    //             if (_.isEmpty(matches)) {
    //               // We need to re-scan the main topic if we dont have any matches,
    //               // or we end up skipping over it.
    //               eachGambit("topic", self._id);
    //             } else {
    //               callback(null, matches);
    //             }
    //           });
    //         });
    //       } else {
    //         // GH-100, lets see if we have any matches at THIS level. (Match BACK)
    //         // We want to walk back up the tree.
    //         debug("Look back at", lastReply);
    //         Reply.findOne({id:replyId})
    //         .populate('parent')
    //         .exec(function(err, res){
    //           // We need to re-scan the main topic if we dont have any matches, 
    //           // or we end up skipping over it.
    //           if (res.parent.parent) {
    //             debug("Going back to Parent parent", res.parent.parent);
    //             eachGambit("reply", res.parent.parent);
    //           } else {
    //             // If we don't find anything, lets look at this topic.
    //             debug("We got nothing... TOPIC Search");
    //             eachGambit("topic", self._id);
    //           }
    //         });
    //       }
    //     }
    //   ); // exec
    // } else {
    //   // No previous, normal search
    //   eachGambit("topic", self._id);
    // }

    eachGambit("topic", self._id);
  };

  // Lightweight match for one topic
  topicSchema.methods.doesMatch = function (message, cb) {
    var self = this;

    var itor = function (gambit, next) {
      gambit.doesMatch(message, function (err, match2) {
        if (err) {
          console.log(err);
        }
        next(match2 ? gambit._id : null);
      });
    };

    Topic.findOne({name: self.name}, "gambits")
      .populate("gambits")
      .exec(function (err, mgambits) {
        if (err) {
          console.log(err);
        }
        async.filter(mgambits.gambits, itor, function (res) {
          cb(null, res);
        });
      }
    );
  };

  topicSchema.methods.clearGambits = function (callback) {
    var self = this;

    var clearGambit = function (gambitId, cb) {
      self.gambits.pull({ _id: gambitId });
      Gambit.findById(gambitId, function (err, gambit) {
        if (err) {
          console.log(err);
        }

        gambit.clearReplies(function() {
          Gambit.remove({ _id: gambitId }, function (err) {
            if (err) {
              console.log(err);
            }

            debug('removed gambit ' + gambitId);

            cb(null, gambitId);
          });
        });
      });
    };

    async.map(self.gambits, clearGambit, function (err, clearedGambits) {
      self.save(function (err2) {
        callback(err2, clearedGambits);
      });
    });
  };

  // This will find a gambit in any topic
  topicSchema.statics.findTriggerByTrigger = function (input, callback) {
    Gambit.findOne({input: input}).exec(callback);
  };

  topicSchema.statics.findByName = function (name, callback) {
    this.findOne({name: name}, {}, callback);
  };

  // Private function to score the topics by TF-IDF
  var _score = function (msg) {
    var docs = [];

    // Here we score the input aginst the topic kewords to come up with a topic order.
    tfidf.tfidfs(msg.lemString.tokenizeAndStem(), function (index, m, k) {

      // Filter out system topic pre/post
      if (k !== "__pre__" && k !== "__post__") {
        docs.push({topic: k, score: m});
      }
    });

    // Removes duplicate entries.
    docs = _.uniq(docs, function (item, key, a) {
      return item.topic;
    });

    var topicOrder = _.sortBy(docs, function (item) {
      return item.score;
    }).reverse();

    return _.map(topicOrder, function (item) {
      return {name: item.topic, score: item.score, type:'TOPIC'};
    });
  };

  topicSchema.statics.findPendingTopicsForUser = function (user, msg, callback) {

    var self = this;
    var currentTopic = user.getTopic();
    var aTopics = [];
    var i;

    var scoredTopics = _score(msg);

    self.find({system: {"$ne": true }}, function (err, allTopics) {
      if (err) {
        console.log(err);
      }

      // Add the current topic to the top of the stack.
      scoredTopics.unshift({name: currentTopic, type:'TOPIC'});

      var otherTopics = allTopics;
      otherTopics = _.map(otherTopics, function (item) {
        return {id: item._id, name: item.name};
      });

      // This gets a list if all the remaining topics.
      otherTopics = _.filter(scoredTopics, function(obj){
        return !_.findWhere(otherTopics, {name: obj.name});
      });

      aTopics.push({name: "__pre__", type:"TOPIC"});

      for (i = 0; i < scoredTopics.length; i++) {
        if (scoredTopics[i].name !== "__post__" && scoredTopics[i].name !== "__pre__") {
          aTopics.push(scoredTopics[i]);
        }
      }

      for (i = 0; i < otherTopics.length; i++) {
        if (otherTopics[i].name !== "__post__" && otherTopics[i].name !== "__pre__") {
          aTopics.push(otherTopics[i]);
        }
      }

      aTopics.push({name: "__post__", type:"TOPIC"});

      // Lets assign the ids to the topics
      for (var i = 0; i < aTopics.length; i++) {
        var tName = aTopics[i].name;
        for (var n = 0; n < allTopics.length; n++) {
          if (allTopics[n].name === tName) {
            aTopics[i].id = allTopics[n]._id;
          }
        }
      }

      // If we are currently in a conversation, we want the entire chain added to the topics to search
      var lastReply = user.__history__.reply[0];
      var replyThreads = [];

      // TODO: we also want to see when the last message was sent
      if (!_.isEmpty(lastReply)) {
        var replyId = lastReply.replyId;
        debug("Last reply: ", lastReply.raw, replyId);

        var walkParent = function (repID, cb) {
          Reply.findOne({_id: repID})
            .populate('parent')
            .exec(function (err, reply) {
              if (err) {
                console.log(err);
              }

              if (reply) {
                replyThreads.push({id: reply._id, type: 'REPLY'});
                if (reply.parent.parent) {
                  walkParent(reply.parent.parent, cb);
                } else {
                  cb();
                }
              }
            });
        };


        Reply.findOne({id: replyId}).exec(function (err, reply) {
          walkParent(reply._id, function () {
            replyThreads.unshift(1, 0);
            Array.prototype.splice.apply(aTopics, replyThreads);
            console.log("Result", aTopics);
            callback(null, aTopics);
          });
        });
      } else {
        callback(null, aTopics);
      }

    });
  };

  topicSchema.plugin(findOrCreate);

  try {
    return mongoose.model("Topic", topicSchema);
  } catch(e) {
    return mongoose.model("Topic");
  }
};
