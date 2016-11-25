'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _re = require('re2');

var _re2 = _interopRequireDefault(_re);

var _regexes = require('./regexes');

var _regexes2 = _interopRequireDefault(_regexes);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var _processTags = require('./processTags');

var _processTags2 = _interopRequireDefault(_processTags);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debugLevels2.default)('SS:GetReply');

// Topic iterator, we call this on each topic or conversation reply looking for a match.
// All the matches are stored and returned in the callback.
var topicItorHandle = function topicItorHandle(messageObject, options) {
  var system = options.system;

  return function (topicData, callback) {
    if (topicData.type === 'TOPIC') {
      system.chatSystem.Topic.findOne({ _id: topicData.id }).populate('gambits').exec(function (err, topic) {
        if (err) {
          console.error(err);
        }
        if (topic) {
          // We do realtime post processing on the input against the user object
          topic.findMatch(messageObject, options, callback);
        } else {
          // We call back if there is no topic Object
          // Non-existant topics return false
          callback(null, false);
        }
      });
    } else if (topicData.type === 'REPLY') {
      system.chatSystem.Reply.findOne({ _id: topicData.id }).populate('gambits').exec(function (err, reply) {
        if (err) {
          console.error(err);
        }
        debug.verbose('Conversation reply thread: ', reply);
        if (reply) {
          reply.findMatch(messageObject, options, callback);
        } else {
          callback(null, false);
        }
      });
    } else {
      debug.verbose("We shouldn't hit this! 'topicData.type' should be 'TOPIC' or 'REPLY'");
      callback(null, false);
    }
  };
};

var afterHandle = function afterHandle(user, callback) {
  // Note, the first arg is the ReplyBit (normally the error);
  // We are breaking the matchItorHandle flow on data stream.
  return function (continueSearching, matchSet) {
    debug.verbose('Continue searching: ' + continueSearching);
    debug.verbose('Set of matches: ' + matchSet);

    // remove empties
    matchSet = _lodash2.default.compact(matchSet);

    var minMatchSet = [];
    var props = {};
    var clearConversation = false;
    var lastTopicToMatch = null;
    var lastStarSet = null;
    var lastReplyId = null;
    var replyString = '';
    var lastSubReplies = null;
    var lastContinueMatching = null;
    var lastReplyIds = null;

    for (var i = 0; i < matchSet.length; i++) {
      var item = matchSet[i];
      var mmm = {
        topic: item.matched_topic_string || item.topic,
        input: item.trigger,
        reply: item.matched_reply_string
      };

      if (!_lodash2.default.isEmpty(item.minMatchSet)) {
        mmm.subset = item.minMatchSet;
      } else {
        mmm.output = item.reply.reply;
      }

      minMatchSet.push(mmm);

      if (item && item.reply && item.reply.reply) {
        replyString += item.reply.reply + ' ';
      }

      props = _lodash2.default.assign(props, item.props);
      lastTopicToMatch = item.topic;
      lastStarSet = item.stars;
      lastReplyId = item.reply._id;
      lastSubReplies = item.subReplies;
      lastContinueMatching = item.continueMatching;
      lastReplyIds = item.replyIds;

      if (item.clearConversation) {
        clearConversation = item.clearConversation;
      }
    }

    var threadsArr = [];
    if (_lodash2.default.isEmpty(lastSubReplies)) {
      threadsArr = _processTags2.default.processThreadTags(replyString);
    } else {
      threadsArr[0] = replyString;
      threadsArr[1] = lastSubReplies;
    }

    // only remove one trailing space (because spaces may have been added deliberately)
    var replyStr = new _re2.default('(?:^[ \\t]+)|(?:[ \\t]$)').replace(threadsArr[0], '');

    var cbdata = {
      replyId: lastReplyId,
      replyIds: lastReplyIds,
      props: props,
      clearConversation: clearConversation,
      topicName: lastTopicToMatch,
      minMatchSet: minMatchSet,
      string: replyStr,
      subReplies: threadsArr[1],
      stars: lastStarSet,
      continueMatching: lastContinueMatching
    };

    debug.verbose('afterHandle', cbdata);

    callback(null, cbdata);
  };
};

// This may be called several times, once for each topic.
var filterRepliesBySeen = function filterRepliesBySeen(filteredResults, options, callback) {
  var system = options.system;
  debug.verbose('filterRepliesBySeen', filteredResults);
  var bucket = [];

  var eachResultItor = function eachResultItor(filteredResult, next) {
    var topicName = filteredResult.topic;
    system.chatSystem.Topic.findOne({ name: topicName }).exec(function (err, currentTopic) {
      if (err) {
        console.log(err);
      }

      // var repIndex = filteredResult.id;
      var replyId = filteredResult.reply._id;
      var reply = filteredResult.reply;
      var gambitId = filteredResult.trigger_id2;
      var seenReply = false;

      // Filter out SPOKEN replies.
      // If something is said on a different trigger we don't remove it.
      // If the trigger is very open ie "*", you should consider putting a {keep} flag on it.

      for (var i = 0; i <= 10; i++) {
        var topicItem = options.user.history.topic[i];

        if (topicItem !== undefined) {
          // TODO: Come back to this and check names make sense
          var pastGambit = options.user.history.reply[i];
          var pastInput = options.user.history.input[i];

          // Sometimes the history has null messages because we spoke first.
          if (pastGambit && pastInput) {
            // Do they match and not have a keep flag

            debug.verbose('--------------- FILTER SEEN ----------------');
            debug.verbose('Past replyId', pastGambit.replyId);
            debug.verbose('Current replyId', replyId);
            debug.verbose('Past gambitId', String(pastInput.gambitId));
            debug.verbose('Current gambitId', String(gambitId));
            debug.verbose('reply.keep', reply.keep);
            debug.verbose('currentTopic.keep', currentTopic.keep);

            if (String(replyId) === String(pastGambit.replyId) &&
            // TODO: For conversation threads this should be disabled because we are looking
            // the wrong way.
            // But for forward threads it should be enabled.
            // String(pastInput.gambitId) === String(inputId) &&
            reply.keep === false && currentTopic.keep === false) {
              debug.verbose('Already Seen', reply);
              seenReply = true;
            }
          }
        }
      }

      if (!seenReply || system.editMode) {
        bucket.push(filteredResult);
      }
      next();
    });
  };

  _async2.default.each(filteredResults, eachResultItor, function () {
    debug.verbose('Bucket of selected replies: ', bucket);
    if (!_lodash2.default.isEmpty(bucket)) {
      callback(null, _utils2.default.pickItem(bucket));
    } else {
      callback(true);
    }
  });
}; // end filterBySeen

var filterRepliesByFunction = function filterRepliesByFunction(potentialReplies, options, callback) {
  var filterHandle = function filterHandle(potentialReply, cb) {
    var system = options.system;

    // We support a single filter function in the reply
    // It returns true/false to aid in the selection.

    if (potentialReply.reply.filter !== '') {
      var filterFunction = _regexes2.default.filter.match(potentialReply.reply.filter);
      var pluginName = _utils2.default.trim(filterFunction[1]);
      var partsStr = _utils2.default.trim(filterFunction[2]);
      var args = _utils2.default.replaceCapturedText(partsStr.split(','), [''].concat(potentialReply.stars));

      debug.verbose('Filter function found with plugin name: ' + pluginName);

      if (system.plugins[pluginName]) {
        args.push(function (err, filterReply) {
          if (err) {
            console.log(err);
          }

          if (filterReply === 'true' || filterReply === true) {
            cb(err, true);
          } else {
            cb(err, false);
          }
        });

        var filterScope = _lodash2.default.merge({}, system.scope);
        filterScope.user = options.user;
        filterScope.message = options.message;
        filterScope.message_props = options.system.extraScope;

        debug.verbose('Calling plugin function: ' + pluginName + ' with args: ' + args);
        system.plugins[pluginName].apply(filterScope, args);
      } else {
        // If a function is missing, we kill the line and return empty handed
        // Let's remove it and try to carry on.
        console.log('\nWARNING:\nYou have a missing filter function (' + pluginName + ') - your script will not behave as expected!"');
        // Wow, worst variable name ever - sorry.
        potentialReply = _utils2.default.trim(potentialReply.reply.reply.replace(filterFunction[0], ''));
        cb(null, true);
      }
    } else {
      cb(null, true);
    }
  };

  _async2.default.filter(potentialReplies, filterHandle, function (err, filteredReplies) {
    debug.verbose('filterByFunction results: ', filteredReplies);

    filterRepliesBySeen(filteredReplies, options, function (err, reply) {
      if (err) {
        debug.error(err);
        // Keep looking for results
        // Invoking callback with no arguments ensure mapSeries carries on looking at matches from other gambits
        callback();
      } else {
        _processTags2.default.processReplyTags(reply, options, function (err, replyObj) {
          if (!_lodash2.default.isEmpty(replyObj)) {
            // reply is the selected reply object that we created earlier (wrapped mongoDB reply)
            // reply.reply is the actual mongoDB reply object
            // reply.reply.reply is the reply string
            replyObj.matched_reply_string = reply.reply.reply;
            replyObj.matched_topic_string = reply.topic;

            debug.verbose('Reply object after processing tags: ', replyObj);

            if (replyObj.continueMatching === false) {
              debug.info('Continue matching is set to false: returning.');
              callback(true, replyObj);
            } else if (replyObj.continueMatching === true || replyObj.reply.reply === '') {
              debug.info('Continue matching is set to true or reply is not empty: continuing.');
              // By calling back with error set as 'true', we break out of async flow
              // and return the reply to the user.
              callback(null, replyObj);
            } else {
              debug.info('Reply is not empty: returning.');
              callback(true, replyObj);
            }
          } else {
            debug.verbose('No reply object was received from processTags so check for more.');
            if (err) {
              debug.verbose('There was an error in processTags', err);
            }
            callback(null, null);
          }
        });
      }
    });
  });
};

// Iterates through matched gambits
var matchItorHandle = function matchItorHandle(message, options) {
  var system = options.system;
  options.message = message;

  return function (match, callback) {
    debug.verbose('Match itor: ', match.gambit);

    // In some edge cases, replies were not being populated...
    // Let's do it here
    system.chatSystem.Gambit.findById(match.gambit._id).populate('replies').exec(function (err, gambitExpanded) {
      if (err) {
        console.log(err);
      }

      match.gambit = gambitExpanded;

      match.gambit.getRootTopic(function (err, topic) {
        if (err) {
          console.log(err);
        }

        var rootTopic = void 0;
        if (match.topic) {
          rootTopic = match.topic;
        } else {
          rootTopic = topic;
        }

        var stars = match.stars;
        if (!_lodash2.default.isEmpty(message.stars)) {
          stars = message.stars;
        }

        var potentialReplies = [];

        for (var i = 0; i < match.gambit.replies.length; i++) {
          var reply = match.gambit.replies[i];
          var replyData = {
            id: reply.id,
            topic: rootTopic,
            stars: stars,
            reply: reply,

            // For the logs
            trigger: match.gambit.input,
            trigger_id: match.gambit.id,
            trigger_id2: match.gambit._id
          };
          potentialReplies.push(replyData);
        }

        // Find a reply for the match.
        filterRepliesByFunction(potentialReplies, options, callback);
      });
    });
  };
};

/**
 * The real craziness to retreive a reply.
 * @param {Object} messageObject - The instance of the Message class for the user input.
 * @param {Object} options.system - The system.
 * @param {Object} options.user - The user.
 * @param {Number} options.depth - The depth of how many times this function has been recursively called.
 * @param {Array} options.pendingTopics - A list of topics that have been specified to specifically search (usually via topicRedirect etc).
 * @param {Function} callback - Callback function once the reply has been found.
 */
var getReply = function getReply(messageObject, options, callback) {
  // This method can be called recursively.
  if (options.depth) {
    debug.verbose('Called Recursively', options.depth);
    if (options.depth >= 50) {
      console.error('getReply was called recursively 50 times - returning null reply.');
      return callback(null, null);
    }
  }

  // We already have a pre-set list of potential topics from directReply, respond or topicRedirect
  if (!_lodash2.default.isEmpty(options.pendingTopics)) {
    debug.verbose('Using pre-set topic list via directReply, respond or topicRedirect');
    debug.info('Topics to check: ', options.pendingTopics.map(function (topic) {
      return topic.name;
    }));
    afterFindPendingTopics(options.pendingTopics, messageObject, options, callback);
  } else {
    var chatSystem = options.system.chatSystem;

    // Find potential topics for the response based on the message (tfidfs)
    chatSystem.Topic.findPendingTopicsForUser(options.user, messageObject, function (err, pendingTopics) {
      if (err) {
        console.log(err);
      }
      afterFindPendingTopics(pendingTopics, messageObject, options, callback);
    });
  }
};

var afterFindPendingTopics = function afterFindPendingTopics(pendingTopics, messageObject, options, callback) {
  debug.verbose('Found pending topics/conversations: ' + JSON.stringify(pendingTopics));

  // We use map here because it will bail on error.
  // The error is our escape hatch when we have a reply WITH data.
  _async2.default.mapSeries(pendingTopics, topicItorHandle(messageObject, options), function (err, results) {
    if (err) {
      console.error(err);
    }

    // Remove the empty topics, and flatten the array down.
    var matches = _lodash2.default.flatten(_lodash2.default.filter(results, function (n) {
      return n;
    }));

    // TODO - This sort should happen in the process sort logic.
    // Try matching most specific question matches first
    matches = matches.sort(function (a, b) {
      var questionTypeA = a.gambit.qType || '';
      var questionSubTypeA = a.gambit.qSubType || '';
      var questionTypeB = b.gambit.qType || '';
      var questionSubTypeB = b.gambit.qSubType || '';
      return questionTypeA.concat(questionSubTypeA).length < questionTypeB.concat(questionSubTypeB).length;
    });

    debug.verbose('Matching gambits are: ');
    matches.forEach(function (match) {
      debug.verbose('Trigger: ' + match.gambit.input);
      debug.verbose('Replies: ' + match.gambit.replies.map(function (reply) {
        return reply.reply;
      }).join('\n'));
    });

    // Was `eachSeries`
    _async2.default.mapSeries(matches, matchItorHandle(messageObject, options), afterHandle(options.user, callback));
  });
};

exports.default = getReply;