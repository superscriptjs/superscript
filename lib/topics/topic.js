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

      //
      var execHandle = function(err, mgambits) {
        
        var iter = function (gambit, cb) {
          Reply.populate(gambit, { path: 'replies' }, cb);
        };

        async.each(mgambits.gambits, iter, function done (err2) {
          if (err2) {
            console.log(err2);
          }
          async.each(mgambits.gambits, eachGambitHandle, function eachGambitHandleComplete() {
            callback(null, matches);
          });
        });
      };

      if (type === 'topic') {
        debug("Looking back Topic", id);
        Topic.findOne({_id: id}, 'gambits')
          .populate('gambits')
          .exec(execHandle);
      } else {
        debug("Looking back at Conversation", id);
        Reply.findOne({_id: id}, 'gambits')
         .populate('gambits')
         .exec(execHandle);
      }

    };

    eachGambitHandle = function (trigger, callback) {

      var match = false;
      var stars = [];

      regexreply.postParse(trigger.trigger, message, user, function complexFunction(regexp) {
        var pattern = new RegExp("^" + regexp + "$", "i");

        debug("Try to match (clean)'" + message.clean + "' against " +
          trigger.trigger + " (" + regexp + ") topic: " + self.name +
          " or prevMatch");
        debug("Try to match (lemma)'" + message.lemString + "' against " +
          trigger.trigger + " (" + regexp + ") topic: " + self.name +
          " or prevMatch");

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


    // Search for previous match
    var lastReply = user.__history__.reply[0];
    if (!_.isEmpty(lastReply)) {
      var replyId = lastReply.replyId;
      debug("Last reply: ", lastReply.raw, replyId);
      Reply.findOne({id: replyId, gambits: {$not: {$size: 0}}})
        .populate("gambits")
        .exec(function (err, mgambits) {
          if (err) {
            console.log(err);
          }

          var iter = function (gambit, cb) {
            Reply.populate(gambit, {path: "replies"}, cb);
          };

          if (mgambits) {
            debug("Found", mgambits);
            async.each(mgambits.gambits, iter, function done(err) {
              async.each(mgambits.gambits, eachGambitHandle, function eachGambitHandleComplete() {
                if (_.isEmpty(matches)) {
                  // We need to re-scan the main topic if we dont have any matches,
                  // or we end up skipping over it.
                  eachGambit("topic", self._id);
                } else {
                  callback(null, matches);
                }
              });
            });
          } else {
            // GH-100, lets see if we have any matches at THIS level. (Match BACK)
            // We want to walk back up the tree.
            debug("Look back at", lastReply);
            Reply.findOne({id:replyId})
            .populate('parent')
            .exec(function(err, res){
              // We need to re-scan the main topic if we dont have any matches, 
              // or we end up skipping over it.
              if (res.parent.parent) {
                eachGambit('reply', res.parent.parent);
              } else {
                // If we don't find anything, lets look at this topic.
                eachGambit("topic", self._id);
              }
            });
          }
        }
      ); // exec
    } else {
      // No previous, normal search
      eachGambit("topic", self._id);
    }
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

  topicSchema.statics.findPendingTopicsForUser = function (user, msg, callback) {

    var self = this;
    var aTopics = [];
    var docs = [];
    var i;

    self.find({system: {"$ne": true }}, function (err, topics) {
      if (err) {
        console.log(err);
      }

      tfidf.tfidfs(msg.lemString.tokenizeAndStem(), function (index, m, k) {
        if (k !== "__pre__" && k !== "__post__") {
          docs.push({topic: k, score: m});
        }
      });

      var topicOrder = _.sortBy(docs, function (item) {
        return item.score;
      }).reverse();

      var allTopics = _.map(topicOrder, function (item) {
        return item.topic;
      });

      // All topics with keywords.. we may have topics with new keywords?
      // like random or dynamically created topics

      // Move the current topic to the top of the stack,
      // This allows us to match previous rejoiners
      var currentTopic = user.getTopic();
      allTopics.unshift(currentTopic);

      var otherTopics = topics;
      otherTopics = _.map(otherTopics, function (item) {
        return item.name;
      });

      otherTopics = _.difference(otherTopics, allTopics);

      // Filter out system topics

      allTopics = _.filter(allTopics, function (topicName) {
        for (i = 0; i < topics.length; i++) {
          var topic = topics[i];
          if (topic.name === topicName) {
            return !topic.system;
          } else {
            return true;
          }
        }
      });

      aTopics.push("__pre__");

      for (i = 0; i < allTopics.length; i++) {
        if (allTopics[i] !== "__post__" && allTopics[i] !== "__pre__") {
          aTopics.push(allTopics[i]);
        }
      }

      for (i = 0; i < otherTopics.length; i++) {
        if (otherTopics[i] !== "__post__" && otherTopics[i] !== "__pre__") {
          aTopics.push(otherTopics[i]);
        }
      }

      aTopics.push("__post__");
      callback(null, aTopics);
    });
  };

  topicSchema.plugin(findOrCreate);

  try {
    return mongoose.model("Topic", topicSchema);
  } catch(e) {
    return mongoose.model("Topic");
  }
};
