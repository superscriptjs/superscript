'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

var _safeEval = require('safe-eval');

var _safeEval2 = _interopRequireDefault(_safeEval);

var _modelNames = require('./modelNames');

var _modelNames2 = _interopRequireDefault(_modelNames);

var _utils = require('../utils');

var _utils2 = _interopRequireDefault(_utils);

var _postParse = require('../postParse');

var _postParse2 = _interopRequireDefault(_postParse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debugLevels2.default)('SS:Common'); // These are shared helpers for the models.

var _walkReplyParent = function _walkReplyParent(db, tenantId, replyId, replyIds, cb) {
  db.model(_modelNames2.default.reply).byTenant(tenantId).findById(replyId).populate('parent').exec(function (err, reply) {
    if (err) {
      debug.error(err);
    }

    debug.info('Walk', reply);

    if (reply) {
      replyIds.push(reply._id);
      if (reply.parent && reply.parent.parent) {
        _walkReplyParent(db, tenantId, reply.parent.parent, replyIds, cb);
      } else {
        cb(null, replyIds);
      }
    } else {
      cb(null, replyIds);
    }
  });
};

var _walkGambitParent = function _walkGambitParent(db, tenantId, gambitId, gambitIds, cb) {
  db.model(_modelNames2.default.gambit).byTenant(tenantId).findOne({ _id: gambitId }).populate('parent').exec(function (err, gambit) {
    if (err) {
      console.log(err);
    }

    if (gambit) {
      gambitIds.push(gambit._id);
      if (gambit.parent && gambit.parent.parent) {
        _walkGambitParent(db, tenantId, gambit.parent.parent, gambitIds, cb);
      } else {
        cb(null, gambitIds);
      }
    } else {
      cb(null, gambitIds);
    }
  });
};

// This will find all the gambits to process by parent (topic or conversation)
// and return ones that match the message
var findMatchingGambitsForMessage = function findMatchingGambitsForMessage(db, tenantId, type, id, message, options, callback) {
  // Let's query for Gambits
  var execHandle = function execHandle(err, gambitsParent) {
    if (err) {
      console.error(err);
    }

    var populateGambits = function populateGambits(gambit, next) {
      debug.verbose('Populating gambit');
      db.model(_modelNames2.default.reply).byTenant(tenantId).populate(gambit, { path: 'replies' }, next);
    };

    _async2.default.each(gambitsParent.gambits, populateGambits, function (err) {
      debug.verbose('Completed populating gambits');
      if (err) {
        console.error(err);
      }
      _async2.default.map(gambitsParent.gambits, _eachGambitHandle(message, options), function (err3, matches) {
        callback(null, _lodash2.default.flatten(matches));
      });
    });
  };

  if (type === 'topic') {
    debug.verbose('Looking back Topic', id);
    db.model(_modelNames2.default.topic).byTenant(tenantId).findOne({ _id: id }, 'gambits').populate({ path: 'gambits' }).exec(execHandle);
  } else if (type === 'reply') {
    options.topic = 'reply';
    debug.verbose('Looking back at Conversation', id);
    db.model(_modelNames2.default.reply).byTenant(tenantId).findOne({ _id: id }, 'gambits').populate({ path: 'gambits' }).exec(execHandle);
  } else {
    debug.verbose('We should never get here');
    callback(true);
  }
};

var _afterHandle = function _afterHandle(match, gambit, topic, cb) {
  debug.verbose('Match found: ' + gambit.input + ' in topic: ' + topic);
  var stars = [];
  if (match.length > 1) {
    for (var j = 1; j < match.length; j++) {
      if (match[j]) {
        var starData = _utils2.default.trim(match[j]);
        // Concepts are not allowed to be stars or captured input.
        starData = starData[0] === '~' ? starData.substr(1) : starData;
        stars.push(starData);
      }
    }
  }

  var data = { stars: stars, gambit: gambit };
  if (topic !== 'reply') {
    data.topic = topic;
  }

  var matches = [data];
  cb(null, matches);
};

/* This is a function to determine whether a certain key has been set to a certain value.
 * The double percentage sign (%%) syntax is used in the script to denote that a gambit
 * must meet a condition before being executed, e.g.
 *
 * %% (userKilledAlice === true)
 * + I love you.
 * - I still haven't forgiven you, you know.
 *
 * The context is whatever a user has previously set in any replies. So in this example,
 * if a user has set {userKilledAlice = true}, then the gambit is matched.
 */
var processConditions = function processConditions(conditions, options) {
  var context = options.user.conversationState || {};

  return _lodash2.default.every(conditions, function (condition) {
    debug.verbose('Check condition - Context: ', context);
    debug.verbose('Check condition - Condition: ', condition);

    try {
      var result = (0, _safeEval2.default)(condition, context);
      if (result) {
        debug.verbose('--- Condition TRUE ---');
        return true;
      }
      debug.verbose('--- Condition FALSE ---');
      return false;
    } catch (e) {
      debug.verbose('Error in condition checking: ' + e.stack);
      return false;
    }
  });
};

/**
 * Takes a gambit and a message, and returns non-null if they match.
 */
var doesMatch = function doesMatch(gambit, message, options, callback) {
  if (gambit.conditions && gambit.conditions.length > 0) {
    var conditionsMatch = processConditions(gambit.conditions, options);
    if (!conditionsMatch) {
      debug.verbose('Conditions did not match');
      callback(null, false);
      return;
    }
  }

  var match = false;

  // Replace <noun1>, <adverb1> etc. with the actual words in user message
  (0, _postParse2.default)(gambit.trigger, message, options.user, function (regexp) {
    var pattern = new RegExp('^' + regexp + '$', 'i');

    debug.verbose('Try to match (clean)\'' + message.clean + '\' against ' + gambit.trigger + ' (' + pattern + ')');
    debug.verbose('Try to match (lemma)\'' + message.lemString + '\' against ' + gambit.trigger + ' (' + pattern + ')');

    // Match on the question type (qtype / qsubtype)
    if (gambit.isQuestion && message.isQuestion) {
      debug.verbose('Gambit and message are questions, testing against question types');
      if (_lodash2.default.isEmpty(gambit.qType) && _lodash2.default.isEmpty(gambit.qSubType)) {
        // Gambit does not specify what type of question it should be, so just match
        match = message.clean.match(pattern);
        if (!match) {
          match = message.lemString.match(pattern);
        }
      } else if (!_lodash2.default.isEmpty(gambit.qType) && _lodash2.default.isEmpty(gambit.qSubType) && (message.questionType === gambit.qType || message.questionSubType.indexOf(gambit.qType) !== -1)) {
        // Gambit specifies question type only
        match = message.clean.match(pattern);
        if (!match) {
          match = message.lemString.match(pattern);
        }
      } else if (!_lodash2.default.isEmpty(gambit.qType) && !_lodash2.default.isEmpty(gambit.qSubType) && message.questionSubType.indexOf(gambit.qType) !== -1 && message.questionSubType.indexOf(gambit.qSubType) !== -1) {
        // Gambit specifies both question type and question sub type
        match = message.clean.match(pattern);
        if (!match) {
          match = message.lemString.match(pattern);
        }
      }
    } else {
      // This is a normal match
      if (gambit.isQuestion === false) {
        match = message.clean.match(pattern);
        if (!match) {
          match = message.lemString.match(pattern);
        }
      }
    }

    debug.verbose('Match at the end of doesMatch was: ' + match);

    callback(null, match);
  });
};

// This is the main function that looks for a matching entry
var _eachGambitHandle = function _eachGambitHandle(message, options) {
  var filterRegex = /\s*\^(\w+)\(([\w<>,\|\s]*)\)\s*/i;

  // This takes a gambit that is a child of a topic or reply and checks if
  // it matches the user's message or not.
  return function (gambit, callback) {
    var plugins = options.system.plugins;
    var scope = options.system.scope;
    var topic = options.topic || 'reply';
    var chatSystem = options.system.chatSystem;

    doesMatch(gambit, message, options, function (err, match) {
      if (!match) {
        debug.verbose('Gambit trigger does not match input.');
        return callback(null, []);
      }

      // A filter is syntax that calls a plugin function such as:
      // - {^functionX(true)} Yes, you are.
      if (gambit.filter !== '') {
        debug.verbose('We have a filter function: ' + gambit.filter);

        var filterFunction = gambit.filter.match(filterRegex);
        debug.verbose('Filter function matched against regex gave: ' + filterFunction);

        var pluginName = _utils2.default.trim(filterFunction[1]);
        var parts = _utils2.default.trim(filterFunction[2]).split(',');

        if (!plugins[pluginName]) {
          debug.verbose('Custom Filter Function not-found', pluginName);
          callback(null, []);
        }

        // These are the arguments to the function (cleaned version of parts)
        var args = [];
        for (var i = 0; i < parts.length; i++) {
          if (parts[i] !== '') {
            args.push(parts[i].trim());
          }
        }

        if (plugins[pluginName]) {
          // The filterScope is what 'this' is during the execution of the plugin.
          // This is so you can write plugins that can access, e.g. this.user or this.chatSystem
          // Here we augment the global scope (system.scope) with any additional local scope for
          // the current reply.
          var filterScope = _lodash2.default.merge({}, scope);
          filterScope.message = message;
          //          filterScope.message_props = options.localOptions.messageScope;
          filterScope.user = options.user;

          args.push(function (err, filterReply) {
            if (err) {
              console.error(err);
            }

            debug.verbose('Reply from filter function was: ' + filterReply);

            // TODO: This seems weird... Investigate
            if (filterReply === 'true' || filterReply === true) {
              if (gambit.redirect !== '') {
                debug.verbose('Found Redirect Match with topic %s', topic);
                chatSystem.Topic.findTriggerByTrigger(gambit.redirect, function (err2, trigger) {
                  if (err2) {
                    console.error(err2);
                  }

                  gambit = trigger;
                  callback(null, []);
                });
              } else {
                // Tag the message with the found Trigger we matched on
                message.gambitId = gambit._id;
                _afterHandle(match, gambit, topic, callback);
              }
            } else {
              callback(null, []);
            }
          });

          debug.verbose('Calling Plugin Function', pluginName);
          plugins[pluginName].apply(filterScope, args);
        }
      } else if (gambit.redirect !== '') {
        // If there's no filter, check if there's a redirect
        // TODO: Check this works/is sane
        debug.verbose('Found Redirect Match with topic');
        chatSystem.Topic.findTriggerByTrigger(gambit.redirect, function (err, trigger) {
          if (err) {
            console.log(err);
          }

          debug.verbose('Redirecting to New Gambit', trigger);
          gambit = trigger;
          // Tag the message with the found Trigger we matched on
          message.gambitId = gambit._id;
          _afterHandle(match, gambit, topic, callback);
        });
      } else {
        // Tag the message with the found Trigger we matched on
        message.gambitId = gambit._id;
        _afterHandle(match, gambit, topic, callback);
      }
    }); // end regexReply
  };
}; // end EachGambit

var walkReplyParent = function walkReplyParent(db, tenantId, replyId, cb) {
  _walkReplyParent(db, tenantId, replyId, [], cb);
};

var walkGambitParent = function walkGambitParent(db, tenantId, gambitId, cb) {
  _walkGambitParent(db, tenantId, gambitId, [], cb);
};

exports.default = {
  walkReplyParent: walkReplyParent,
  walkGambitParent: walkGambitParent,
  doesMatch: doesMatch,
  findMatchingGambitsForMessage: findMatchingGambitsForMessage
};