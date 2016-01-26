/*global Reply, Topic, Gambit */
/**

  Topics are a grouping of gambits.
  The order of the Gambits are important, and a gambit can live in more than one topic.

**/

var natural = require("natural");
var _ = require("lodash");
var async = require("async");
var findOrCreate = require("mongoose-findorcreate");
var debug = require("debug")("Topics");
var Sort = require("./sort");
var Common = require("./common");
var safeEval = require("safe-eval");

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
    gambits: [{ type: String, ref: "Gambit"}],
    conditions: [{ type: String, ref: "Condition"}]
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

  topicSchema.methods.createCondition = function(conditionData, callback) {
    var self = this;
    if (!conditionData) {
      return callback("No data");
    }

    if (_.isEmpty(conditionData.gambits)) {
      return callback("No gambits");
    } else {
      var gambits = [];
      var gambitLookup = function(gambit_id, next) {
        Gambit.findOne({id: gambit_id}, function(error, gambit) {
          gambits.push(gambit._id);
          next();
        });
      };

      async.each(conditionData.gambits, gambitLookup, function() {

        conditionData.gambits = gambits;
        var condition = new Condition(conditionData);

        condition.save(function (err) {
          if (err) {
            return callback(err);
          }
          self.conditions.addToSet(condition._id);
          self.save(function (err2) {
            callback(err2, condition);
          });
        });        
      })
    }
  };

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

  topicSchema.methods.checkConditions = function(message, user, plugins, scope, localOptions, callback) {
    var self = this;
    // Okay, were is the user state?
    var conditionItor = function(cond, next) {

      var context = user.conversationState || {};
      
      debug("CheckItor - Context", context);
      debug("CheckItor - Condition", cond.condition);

      try {        
        if (safeEval(cond.condition, context)) {
          debug("--- Condition TRUE YAY ---");

          var options = {
            message: message,
            user: user,
            plugins: plugins,
            scope: scope,
            topic: self.name,
            localOptions: localOptions
          };

          cond.doesMatch(options, next);
        } else {
          next(true);
        }
      } catch(e) {
        next(true);
      }
    };

    async.mapSeries(this.conditions, conditionItor, function(err, res) {
      if (err) {
        return callback(true, []);
      } else {
        callback(err, _.flatten(res));
      }
    });

    
  };

  topicSchema.methods.findMatch = function (message, user, plugins, scope, localOptions, callback) {
    var self = this;

    var options = {
      message: message,
      user: user,
      plugins: plugins,
      scope: scope,
      topic: this.name,
      localOptions: localOptions
    };

    Common.eachGambit("topic", self._id, options, callback);
  };

  // Lightweight match for one topic
  // TODO offload this to common
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
    var tas = msg.lemString.tokenizeAndStem();
    debug("Token And Stem Words", tas);
    // Here we score the input aginst the topic kewords to come up with a topic order.
    tfidf.tfidfs(tas, function (index, m, k) {

      // Filter out system topic pre/post
      if (k !== "__pre__" && k !== "__post__") {
        docs.push({topic: k, score: m});
      }
    });

    // Removes duplicate entries.
    docs = _.uniq(docs, function (item, key, a) {
      return item.topic;
    });

    debug("Score Inner", docs);
    var topicOrder = _.sortBy(docs, function (item) {
      return item.score;
    }).reverse();

    return _.map(topicOrder, function (item) {
      return {name: item.topic, score: item.score, type:'TOPIC'};
    });
  };

  exports.rootTopic = function (repId, cb) {
    _walkParent(repId, [], cb);
  };


  topicSchema.statics.findPendingTopicsForUser = function (user, msg, callback) {

    var self = this;
    var currentTopic = user.getTopic();
    var aTopics = [];
    var i;

    var scoredTopics = _score(msg);
    debug("Topic Score", scoredTopics);

    var removeMissingTopics = function(top) {
      return _.filter(top, function(item) {
        return item.id;
      });
    };

    self.find({}, function (err, allTopics) {
      if (err) {
        console.log(err);
      }

      // Add the current topic to the top of the stack.
      scoredTopics.unshift({name: currentTopic, type:'TOPIC'});

      var otherTopics = allTopics;
      otherTopics = _.map(otherTopics, function (item) {
        return {id: item._id, name: item.name, system: item.system};
      });

      // This gets a list if all the remaining topics.
      otherTopics = _.filter(otherTopics, function (obj) {
        return !_.findWhere(scoredTopics, {name: obj.name});
      });

      // We remove the system topics
      otherTopics = _.filter(otherTopics, function (obj) {
        return obj.system === false;
      });

      aTopics.push({name: "__pre__", type:"TOPIC"});

      for (i = 0; i < scoredTopics.length; i++) {
        if (scoredTopics[i].name !== "__post__" && scoredTopics[i].name !== "__pre__") {
          aTopics.push(scoredTopics[i]);
        }
      }

      for (i = 0; i < otherTopics.length; i++) {
        if (otherTopics[i].name !== "__post__" && otherTopics[i].name !== "__pre__") {
          otherTopics[i].type = "TOPIC";
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

      // If we are currently in a conversation, we want the entire chain added
      // to the topics to search
      var lastReply = user.__history__.reply[0];
      if (!_.isEmpty(lastReply)) {

        // If the message is 5 Minutes old we continue
        var delta = new Date() - lastReply.createdAt;
        if (delta <= 1000 * 300) {
          var replyId = lastReply.replyId;
          var clearBit = lastReply.clearConvo;

          debug("Last reply: ", lastReply.raw, replyId, clearBit);

          if (clearBit === true) {
            debug("Conversation RESET by clearBit");
            callback(null, removeMissingTopics(aTopics));
          } else {
            Reply.findOne({_id: replyId}).exec(function (err, reply) {
              if (!reply) {
                debug("We couldn't match the last reply. Continuing.");
                callback(null, removeMissingTopics(aTopics));
              } else {
                Common.walkReplyParent(reply._id, function (err, replyThreads) {

                  replyThreads = replyThreads.map(function (item) {
                    return {id: item, type: "REPLY"};
                  });

                  replyThreads.unshift(1, 0);
                  Array.prototype.splice.apply(aTopics, replyThreads);

                  callback(null, removeMissingTopics(aTopics));
                });
              }
            });
          }
        } else {
          debug("The conversation thread was to old to continue it.");
          callback(null, removeMissingTopics(aTopics));
        }
      } else {
        callback(null, removeMissingTopics(aTopics));
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
