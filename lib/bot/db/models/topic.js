'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _mongoTenant = require('mongo-tenant');

var _mongoTenant2 = _interopRequireDefault(_mongoTenant);

var _natural = require('natural');

var _natural2 = _interopRequireDefault(_natural);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _mongooseFindorcreate = require('mongoose-findorcreate');

var _mongooseFindorcreate2 = _interopRequireDefault(_mongooseFindorcreate);

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

var _ssParser = require('ss-parser');

var _ssParser2 = _interopRequireDefault(_ssParser);

var _modelNames = require('../modelNames');

var _modelNames2 = _interopRequireDefault(_modelNames);

var _sort = require('../sort');

var _sort2 = _interopRequireDefault(_sort);

var _helpers = require('../helpers');

var _helpers2 = _interopRequireDefault(_helpers);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debugLevels2.default)('SS:Topics'); /**
                                                       Topics are a grouping of gambits.
                                                       The order of the Gambits are important, and a gambit can live in more than one topic.
                                                     **/

var TfIdf = _natural2.default.TfIdf;
var tfidf = new TfIdf();

_natural2.default.PorterStemmer.attach();

// Function to score the topics by TF-IDF
var scoreTopics = function scoreTopics(message) {
  var topics = [];
  var tasMessage = message.lemString.tokenizeAndStem();
  debug.verbose('Tokenised and stemmed words: ', tasMessage);

  // Score the input against the topic keywords to come up with a topic order.
  tfidf.tfidfs(tasMessage, function (index, score, name) {
    // Filter out system topic pre/post
    if (name !== '__pre__' && name !== '__post__') {
      topics.push({ name: name, score: score, type: 'TOPIC' });
    }
  });

  // Removes duplicate entries.
  topics = _lodash2.default.uniqBy(topics, 'name');

  var topicOrder = _lodash2.default.sortBy(topics, 'score').reverse();
  debug.verbose('Scored topics: ', topicOrder);

  return topicOrder;
};

var createTopicModel = function createTopicModel(db) {
  var topicSchema = new _mongoose2.default.Schema({
    name: { type: String, index: true, unique: true },
    keep: { type: Boolean, default: false },
    system: { type: Boolean, default: false },
    nostay: { type: Boolean, default: false },
    filter: { type: String, default: '' },
    keywords: { type: Array },
    gambits: [{ type: String, ref: _modelNames2.default.gambit }]
  });

  topicSchema.pre('save', function (next) {
    if (!_lodash2.default.isEmpty(this.keywords)) {
      var keywords = this.keywords.join(' ');
      if (keywords) {
        tfidf.addDocument(keywords.tokenizeAndStem(), this.name);
      }
    }
    next();
  });

  // This will create the Gambit and add it to the model
  topicSchema.methods.createGambit = function (gambitData, callback) {
    var _this = this;

    if (!gambitData) {
      return callback('No data');
    }

    var Gambit = db.model(_modelNames2.default.gambit).byTenant(this.getTenantId());
    var gambit = new Gambit(gambitData);
    gambit.save(function (err) {
      if (err) {
        return callback(err);
      }
      _this.gambits.addToSet(gambit._id);
      _this.save(function (err) {
        callback(err, gambit);
      });
    });
  };

  topicSchema.methods.sortGambits = function (callback) {
    var _this2 = this;

    var expandReorder = function expandReorder(gambitId, cb) {
      db.model(_modelNames2.default.gambit).byTenant(_this2.getTenantId()).findById(gambitId, function (err, gambit) {
        if (err) {
          console.log(err);
        }
        cb(null, gambit);
      });
    };

    _async2.default.map(this.gambits, expandReorder, function (err, newGambitList) {
      if (err) {
        console.log(err);
      }

      var newList = _sort2.default.sortTriggerSet(newGambitList);
      _this2.gambits = newList.map(function (gambit) {
        return gambit._id;
      });
      _this2.save(callback);
    });
  };

  topicSchema.methods.findMatch = function findMatch(message, options, callback) {
    options.topic = this.name;

    _helpers2.default.findMatchingGambitsForMessage(db, this.getTenantId(), 'topic', this._id, message, options, callback);
  };

  // Lightweight match for one topic
  // TODO: offload this to common
  topicSchema.methods.doesMatch = function (message, options, cb) {
    var itor = function itor(gambit, next) {
      gambit.doesMatch(message, options, function (err, match2) {
        if (err) {
          debug.error(err);
        }
        next(err, match2 ? gambit._id : null);
      });
    };

    db.model(_modelNames2.default.topic).byTenant(this.getTenantId()).findOne({ name: this.name }, 'gambits').populate('gambits').exec(function (err, mgambits) {
      if (err) {
        debug.error(err);
      }
      _async2.default.filter(mgambits.gambits, itor, function (err, res) {
        cb(null, res);
      });
    });
  };

  topicSchema.methods.clearGambits = function (callback) {
    var _this3 = this;

    var clearGambit = function clearGambit(gambitId, cb) {
      _this3.gambits.pull({ _id: gambitId });
      db.model(_modelNames2.default.gambit).byTenant(_this3.getTenantId()).findById(gambitId, function (err, gambit) {
        if (err) {
          debug.error(err);
        }

        gambit.clearReplies(function () {
          db.model(_modelNames2.default.gambit).byTenant(_this3.getTenantId()).remove({ _id: gambitId }, function (err) {
            if (err) {
              debug.error(err);
            }

            debug.verbose('removed gambit %s', gambitId);

            cb(null, gambitId);
          });
        });
      });
    };

    _async2.default.map(this.gambits, clearGambit, function (err, clearedGambits) {
      _this3.save(function (err) {
        callback(err, clearedGambits);
      });
    });
  };

  // This will find a gambit in any topic
  topicSchema.statics.findTriggerByTrigger = function (input, callback) {
    db.model(_modelNames2.default.gambit).byTenant(this.getTenantId()).findOne({ input: input }).exec(callback);
  };

  topicSchema.statics.findByName = function (name, callback) {
    this.findOne({ name: name }, {}, callback);
  };

  topicSchema.statics.findPendingTopicsForUser = function (user, message, callback) {
    var _this4 = this;

    var currentTopic = user.getTopic();
    var pendingTopics = [];

    var scoredTopics = scoreTopics(message);

    var removeMissingTopics = function removeMissingTopics(topics) {
      return _lodash2.default.filter(topics, function (topic) {
        return topic.id;
      });
    };

    this.find({}, function (err, allTopics) {
      if (err) {
        debug.error(err);
      }

      // Add the current topic to the front of the array.
      scoredTopics.unshift({ name: currentTopic, type: 'TOPIC' });

      var otherTopics = _lodash2.default.map(allTopics, function (topic) {
        return { id: topic._id, name: topic.name, system: topic.system };
      });

      // This gets a list if all the remaining topics.
      otherTopics = _lodash2.default.filter(otherTopics, function (topic) {
        return !_lodash2.default.find(scoredTopics, { name: topic.name });
      });

      // We remove the system topics
      otherTopics = _lodash2.default.filter(otherTopics, function (topic) {
        return topic.system === false;
      });

      pendingTopics.push({ name: '__pre__', type: 'TOPIC' });

      for (var i = 0; i < scoredTopics.length; i++) {
        if (scoredTopics[i].name !== '__pre__' && scoredTopics[i].name !== '__post__') {
          pendingTopics.push(scoredTopics[i]);
        }
      }

      // Search random as the highest priority after current topic and pre
      if (!_lodash2.default.find(pendingTopics, { name: 'random' }) && _lodash2.default.find(otherTopics, { name: 'random' })) {
        pendingTopics.push({ name: 'random', type: 'TOPIC' });
      }

      for (var _i = 0; _i < otherTopics.length; _i++) {
        if (otherTopics[_i].name !== '__pre__' && otherTopics[_i].name !== '__post__') {
          otherTopics[_i].type = 'TOPIC';
          pendingTopics.push(otherTopics[_i]);
        }
      }

      pendingTopics.push({ name: '__post__', type: 'TOPIC' });

      debug.verbose('Pending topics before conversations: ' + JSON.stringify(pendingTopics));

      // Lets assign the ids to the topics
      for (var _i2 = 0; _i2 < pendingTopics.length; _i2++) {
        var topicName = pendingTopics[_i2].name;
        for (var n = 0; n < allTopics.length; n++) {
          if (allTopics[n].name === topicName) {
            pendingTopics[_i2].id = allTopics[n]._id;
          }
        }
      }

      // If we are currently in a conversation, we want the entire chain added
      // to the topics to search
      var lastReply = user.history.reply[0];
      if (!_lodash2.default.isEmpty(lastReply)) {
        // If the message is less than 5 minutes old we continue
        // TODO: Make this time configurable
        var delta = new Date() - lastReply.createdAt;
        if (delta <= 1000 * 300) {
          (function () {
            var replyId = lastReply.replyId;
            var clearConversation = lastReply.clearConversation;
            if (clearConversation === true) {
              debug('Conversation RESET by clearBit');
              callback(null, removeMissingTopics(pendingTopics));
            } else {
              db.model(_modelNames2.default.reply).byTenant(_this4.getTenantId()).find({ _id: { $in: lastReply.replyIds } }).exec(function (err, replies) {
                if (err) {
                  console.error(err);
                }
                if (replies === []) {
                  debug("We couldn't match the last reply. Continuing.");
                  callback(null, removeMissingTopics(pendingTopics));
                } else {
                  (function () {
                    debug('Last reply: ', lastReply.original, replyId, clearConversation);
                    var replyThreads = [];
                    _async2.default.eachSeries(replies, function (reply, next) {
                      _helpers2.default.walkReplyParent(db, _this4.getTenantId(), reply._id, function (err, threads) {
                        debug.verbose('Threads found by walkReplyParent: ' + threads);
                        threads.forEach(function (thread) {
                          return replyThreads.push(thread);
                        });
                        next();
                      });
                    }, function (err) {
                      replyThreads = replyThreads.map(function (item) {
                        return { id: item, type: 'REPLY' };
                      });
                      // This inserts the array replyThreads into pendingTopics after the first topic
                      replyThreads.unshift(1, 0);
                      Array.prototype.splice.apply(pendingTopics, replyThreads);
                      callback(null, removeMissingTopics(pendingTopics));
                    });
                  })();
                }
              });
            }
          })();
        } else {
          debug.info('The conversation thread was to old to continue it.');
          callback(null, removeMissingTopics(pendingTopics));
        }
      } else {
        callback(null, removeMissingTopics(pendingTopics));
      }
    });
  };

  topicSchema.plugin(_mongooseFindorcreate2.default);
  topicSchema.plugin(_mongoTenant2.default);

  return db.model(_modelNames2.default.topic, topicSchema);
};

exports.default = createTopicModel;