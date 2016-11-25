'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

var _utils = require('../utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debugLevels2.default)('SS:Importer'); /**
                                                        *  Import a data file into MongoDB
                                                        */

var KEEP_REGEX = new RegExp('\{keep\}', 'i');
var FILTER_REGEX = /\{\s*\^(\w+)\(([\w<>,\s]*)\)\s*\}/i;

// Whenever and only when a breaking change is made to ss-parser, this needs
// to be updated.
var MIN_SUPPORTED_SCRIPT_VERSION = 1;

var rawToGambitData = function rawToGambitData(gambitId, gambit) {
  var gambitData = {
    id: gambitId,
    isQuestion: false,
    qType: '',
    qSubType: '',
    conditions: gambit.conditional,
    filter: gambit.trigger.filter || '',
    trigger: gambit.trigger.clean,
    input: gambit.trigger.raw
  };

  if (gambit.trigger.question !== null) {
    gambitData.isQuestion = true;
    gambitData.qType = gambit.trigger.question.questionType;
    gambitData.qSubType = gambit.trigger.question.questionSubtype;
  }

  if (gambit.redirect) {
    gambitData.redirect = gambit.redirect;
  }

  return gambitData;
};

var importData = function importData(chatSystem, data, callback) {
  if (!data.version || data.version < MIN_SUPPORTED_SCRIPT_VERSION) {
    return callback('Error: Your script has version ' + data.version + ' but the minimum supported version is ' + MIN_SUPPORTED_SCRIPT_VERSION + '.\nPlease either re-parse your file with a supported parser version, or update SuperScript.');
  }

  var Topic = chatSystem.Topic;
  var Gambit = chatSystem.Gambit;
  var Reply = chatSystem.Reply;
  var User = chatSystem.User;

  var gambitsWithConversation = [];

  var eachReplyItor = function eachReplyItor(gambit) {
    return function (replyId, nextReply) {
      debug.verbose('Reply process: %s', replyId);
      var properties = {
        id: replyId,
        reply: data.replies[replyId],
        parent: gambit._id
      };

      var match = properties.reply.match(KEEP_REGEX);
      if (match) {
        properties.keep = true;
        properties.reply = _utils2.default.trim(properties.reply.replace(match[0], ''));
      }

      match = properties.reply.match(FILTER_REGEX);
      if (match) {
        properties.filter = '^' + match[1] + '(' + match[2] + ')';
        properties.reply = _utils2.default.trim(properties.reply.replace(match[0], ''));
      }

      gambit.addReply(properties, function (err) {
        if (err) {
          console.error(err);
        }
        nextReply();
      });
    };
  };

  var eachGambitItor = function eachGambitItor(topic) {
    return function (gambitId, nextGambit) {
      var gambit = data.gambits[gambitId];
      if (gambit.conversation) {
        debug.verbose('Gambit has conversation (deferring process): %s', gambitId);
        gambitsWithConversation.push(gambitId);
        nextGambit();
      } else if (gambit.topic === topic.name) {
        debug.verbose('Gambit process: %s', gambitId);
        var gambitData = rawToGambitData(gambitId, gambit);

        topic.createGambit(gambitData, function (err, mongoGambit) {
          if (err) {
            console.error(err);
          }
          _async2.default.eachSeries(gambit.replies, eachReplyItor(mongoGambit), function (err) {
            if (err) {
              console.error(err);
            }
            nextGambit();
          });
        });
      } else {
        nextGambit();
      }
    };
  };

  var eachTopicItor = function eachTopicItor(topicName, nextTopic) {
    var topic = data.topics[topicName];
    debug.verbose('Find or create topic with name \'' + topicName + '\'');
    var topicProperties = {
      name: topic.name,
      keep: topic.flags.indexOf('keep') !== -1,
      nostay: topic.flags.indexOf('nostay') !== -1,
      system: topic.flags.indexOf('system') !== -1,
      keywords: topic.keywords,
      filter: topic.filter || ''
    };

    Topic.findOrCreate({ name: topic.name }, topicProperties, function (err, mongoTopic) {
      if (err) {
        console.error(err);
      }

      _async2.default.eachSeries(Object.keys(data.gambits), eachGambitItor(mongoTopic), function (err) {
        if (err) {
          console.error(err);
        }
        debug.verbose('All gambits for ' + topic.name + ' processed.');
        nextTopic();
      });
    });
  };

  var eachConvItor = function eachConvItor(gambitId) {
    return function (replyId, nextConv) {
      debug.verbose('conversation/reply: %s', replyId);
      Reply.findOne({ id: replyId }, function (err, reply) {
        if (err) {
          console.error(err);
        }
        if (reply) {
          reply.gambits.addToSet(gambitId);
          reply.save(function (err) {
            if (err) {
              console.error(err);
            }
            reply.sortGambits(function () {
              debug.verbose('All conversations for %s processed.', gambitId);
              nextConv();
            });
          });
        } else {
          debug.warn('No reply found!');
          nextConv();
        }
      });
    };
  };

  debug.info('Cleaning database: removing all data.');

  // Remove everything before we start importing
  _async2.default.each([Gambit, Reply, Topic, User], function (model, nextModel) {
    model.remove({}, function (err) {
      return nextModel();
    });
  }, function (err) {
    _async2.default.eachSeries(Object.keys(data.topics), eachTopicItor, function () {
      _async2.default.eachSeries(_lodash2.default.uniq(gambitsWithConversation), function (gambitId, nextGambit) {
        var gambitRawData = data.gambits[gambitId];

        var conversations = gambitRawData.conversation || [];
        if (conversations.length === 0) {
          return nextGambit();
        }

        var gambitData = rawToGambitData(gambitId, gambitRawData);
        // TODO: gambit.parent should be able to be multiple replies, not just conversations[0]
        var replyId = conversations[0];

        // TODO??: Add reply.addGambit(...)
        Reply.findOne({ id: replyId }, function (err, reply) {
          if (!reply) {
            console.error('Gambit ' + gambitId + ' is supposed to have conversations (has %), but none were found.');
            nextGambit();
          }
          var gambit = new Gambit(gambitData);
          _async2.default.eachSeries(gambitRawData.replies, eachReplyItor(gambit), function (err) {
            debug.verbose('All replies processed.');
            gambit.parent = reply._id;
            debug.verbose('Saving new gambit: ', err, gambit);
            gambit.save(function (err, gam) {
              if (err) {
                console.log(err);
              }
              _async2.default.mapSeries(conversations, eachConvItor(gam._id), function (err, results) {
                debug.verbose('All conversations for %s processed.', gambitId);
                nextGambit();
              });
            });
          });
        });
      }, function () {
        callback(null, 'done');
      });
    });
  });
};

var importFile = function importFile(chatSystem, path, callback) {
  _fs2.default.readFile(path, function (err, jsonFile) {
    if (err) {
      console.log(err);
    }
    return importData(chatSystem, JSON.parse(jsonFile), callback);
  });
};

exports.default = { importFile: importFile, importData: importData };