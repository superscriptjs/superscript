import _ from 'lodash';
import debuglog from 'debug-levels';
import async from 'async';
import RE2 from 're2';

import regexes from './regexes';
import Utils from './utils';
import processTags from './processTags';

const debug = debuglog('SS:GetReply');

// Topic iterator, we call this on each topic or conversation reply looking for a match.
// All the matches are stored and returned in the callback.
const topicItorHandle = function topicItorHandle(messageObject, options) {
  const system = options.system;

  return (topicData, callback) => {
    if (topicData.type === 'TOPIC') {
      system.chatSystem.Topic.findOne({ _id: topicData.id })
        .populate('gambits')
        .populate('conditions')
        .exec((err, topic) => {
          if (err) {
            console.error(err);
          }
          if (topic) {
            topic.checkConditions(messageObject, options, (err, matches) => {
              debug.verbose('Checking for conditions in %s', topic.name);

              if (!_.isEmpty(matches)) {
                callback(err, matches);
              } else {
                // TODO: Seems overkill to clear entire conversation state - should just kill state that
                // exists within the topic
                options.user.clearConversationState(() => {
                  debug.verbose("Topic either has no conditions or couldn't find any matches using the topic conditions");
                  debug.verbose(`Defaulting to finding match for topic ${topic.name}`);
                  // We do realtime post processing on the input against the user object
                  topic.findMatch(messageObject, options, callback);
                });
              }
            });
          } else {
            // We call back if there is no topic Object
            // Non-existant topics return false
            callback(null, false);
          }
        }
      );
    } else if (topicData.type === 'REPLY') {
      system.chatSystem.Reply.findOne({ _id: topicData.id })
        .populate('gambits')
        .exec((err, reply) => {
          if (err) {
            console.error(err);
          }
          debug.verbose('Conversation reply thread: ', reply);
          if (reply) {
            reply.findMatch(messageObject, options, callback);
          } else {
            callback(null, false);
          }
        }
      );
    } else {
      debug.verbose("We shouldn't hit this! 'topicData.type' should be 'TOPIC' or 'REPLY'");
      callback(null, false);
    }
  };
};

const afterHandle = function afterHandle(user, callback) {
  // Note, the first arg is the ReplyBit (normally the error);
  // We are breaking the matchItorHandle flow on data stream.
  return (replyBit, matchSet) => {
    debug.verbose('MatchSet', replyBit, matchSet);

    // remove empties
    matchSet = _.compact(matchSet);

    const minMatchSet = [];
    let props = {};
    let clearConvo = false;
    let lastTopicToMatch = null;
    let lastStarSet = null;
    let lastReplyId = null;
    let replyString = '';
    let lastSubReplies = null;
    let lastBreakBit = null;

    for (let i = 0; i < matchSet.length; i++) {
      const item = matchSet[i];
      const mmm = {
        topic: item.matched_topic_string || item.topic,
        input: item.trigger,
        reply: item.matched_reply_string,
      };

      if (!_.isEmpty(item.minMatchSet)) {
        mmm.subset = item.minMatchSet;
      } else {
        mmm.output = item.reply.reply;
      }

      minMatchSet.push(mmm);

      if (item && item.reply && item.reply.reply) {
        replyString += `${item.reply.reply} `;
      }

      props = _.assign(props, item.props);
      lastTopicToMatch = item.topic;
      lastStarSet = item.stars;
      lastReplyId = item.reply._id;
      lastSubReplies = item.subReplies;
      lastBreakBit = item.breakBit;

      if (item.clearConvo) {
        clearConvo = item.clearConvo;
      }
    }

    let threadsArr = [];
    if (_.isEmpty(lastSubReplies)) {
      threadsArr = processTags.processThreadTags(replyString);
    } else {
      threadsArr[0] = replyString;
      threadsArr[1] = lastSubReplies;
    }

    // only remove one trailing space (because spaces may have been added deliberately)
    const replyStr = new RE2('(?:^[ \\t]+)|(?:[ \\t]$)').replace(threadsArr[0], '');

    const cbdata = {
      replyId: lastReplyId,
      props,
      clearConvo,
      topicName: lastTopicToMatch,
      minMatchSet,
      string: replyStr,
      subReplies: threadsArr[1],
      stars: lastStarSet,
      breakBit: lastBreakBit,
    };

    debug.verbose('afterHandle', cbdata);

    callback(null, cbdata);
  };
};

// This may be called several times, once for each topic.
const filterRepliesBySeen = function filterRepliesBySeen(filteredResults, options, callback) {
  const system = options.system;
  debug.verbose('filterRepliesBySeen', filteredResults);
  const bucket = [];

  const eachResultItor = function eachResultItor(filteredResult, next) {
    const topicName = filteredResult.topic;
    system.chatSystem.Topic
      .findOne({ name: topicName })
      .exec((err, currentTopic) => {
        if (err) {
          console.log(err);
        }

        // var repIndex = filteredResult.id;
        const replyId = filteredResult.reply._id;
        const reply = filteredResult.reply;
        const gambitId = filteredResult.trigger_id2;
        let seenReply = false;

        // Filter out SPOKEN replies.
        // If something is said on a different trigger we don't remove it.
        // If the trigger is very open ie "*", you should consider putting a {keep} flag on it.

        for (let i = 0; i <= 10; i++) {
          const topicItem = options.user.__history__.topic[i];

          if (topicItem !== undefined) {
            // TODO: Come back to this and check names make sense
            const pastGambit = options.user.__history__.reply[i];
            const pastInput = options.user.__history__.input[i];

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
                reply.keep === false &&
                currentTopic.keep === false) {
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

  async.each(filteredResults, eachResultItor, () => {
    debug.verbose('Bucket of selected replies: ', bucket);
    if (!_.isEmpty(bucket)) {
      callback(null, Utils.pickItem(bucket));
    } else {
      callback(true);
    }
  });
}; // end filterBySeen

const filterRepliesByFunction = function filterRepliesByFunction(potentialReplies, options, callback) {
  const filterHandle = function filterHandle(potentialReply, cb) {
    const system = options.system;

    // We support a single filter function in the reply
    // It returns true/false to aid in the selection.

    if (potentialReply.reply.filter !== '') {
      const filterFunction = regexes.filter.match(potentialReply.reply.filter);
      const pluginName = Utils.trim(filterFunction[1]);
      const partsStr = Utils.trim(filterFunction[2]);
      const args = Utils.replaceCapturedText(partsStr.split(','), [''].concat(potentialReply.stars));

      debug.verbose(`Filter function found with plugin name: ${pluginName}`);

      if (system.plugins[pluginName]) {
        args.push((err, filterReply) => {
          if (err) {
            console.log(err);
          }

          if (filterReply === 'true' || filterReply === true) {
            cb(err, true);
          } else {
            cb(err, false);
          }
        });

        const filterScope = _.merge({}, system.scope);
        filterScope.user = options.user;
        filterScope.message = options.message;
        filterScope.message_props = options.system.extraScope;

        debug.verbose(`Calling plugin function: ${pluginName} with args: ${args}`);
        system.plugins[pluginName].apply(filterScope, args);
      } else {
        // If a function is missing, we kill the line and return empty handed
        // Let's remove it and try to carry on.
        console.log(`\nWARNING:\nYou have a missing filter function (${pluginName}) - your script will not behave as expected!"`);
        // Wow, worst variable name ever - sorry.
        potentialReply = Utils.trim(potentialReply.reply.reply.replace(filterFunction[0], ''));
        cb(null, true);
      }
    } else {
      cb(null, true);
    }
  };

  async.filter(potentialReplies, filterHandle, (err, filteredReplies) => {
    debug.verbose('filterByFunction results: ', filteredReplies);

    filterRepliesBySeen(filteredReplies, options, (err, reply) => {
      if (err) {
        debug.error(err);
        // Keep looking for results
        // Invoking callback with no arguments ensure mapSeries carries on looking at matches from other gambits
        callback();
      } else {
        processTags.processReplyTags(reply, options, (err, replyObj) => {
          if (!_.isEmpty(replyObj)) {
            // reply is the selected reply object that we created earlier (wrapped mongoDB reply)
            // reply.reply is the actual mongoDB reply object
            // reply.reply.reply is the reply string
            replyObj.matched_reply_string = reply.reply.reply;
            replyObj.matched_topic_string = reply.topic;

            debug.verbose('ProcessTags Return', replyObj);

            if (replyObj.breakBit === false) {
              debug.info('Forcing CHECK MORE Mbit');
              callback(null, replyObj);
            } else if (replyObj.breakBit === true || replyObj.reply.reply !== '') {
              callback(true, replyObj);
            } else {
              debug.info('Forcing CHECK MORE Empty Reply');
              callback(null, replyObj);
            }
          } else {
            debug.verbose('ProcessTags Empty');
            if (err) {
              debug.verbose('There was an err in processTags', err);
            }
            callback(null, null);
          }
        });
      }
    });
  });
};

// Iterates through matched gambits
const matchItorHandle = function matchItorHandle(message, options) {
  const system = options.system;
  options.message = message;

  return (match, callback) => {
    debug.verbose('Match itor: ', match.gambit);

    // In some edge cases, replies were not being populated...
    // Let's do it here
    system.chatSystem.Gambit.findById(match.gambit._id)
      .populate('replies')
      .exec((err, gambitExpanded) => {
        if (err) {
          console.log(err);
        }

        match.gambit = gambitExpanded;

        match.gambit.getRootTopic((err, topic) => {
          if (err) {
            console.log(err);
          }

          let rootTopic;
          if (match.topic) {
            rootTopic = match.topic;
          } else {
            rootTopic = topic;
          }

          let stars = match.stars;
          if (!_.isEmpty(message.stars)) {
            stars = message.stars;
          }

          const potentialReplies = [];

          for (let i = 0; i < match.gambit.replies.length; i++) {
            const reply = match.gambit.replies[i];
            const replyData = {
              id: reply.id,
              topic: rootTopic,
              stars,
              reply,

              // For the logs
              trigger: match.gambit.input,
              trigger_id: match.gambit.id,
              trigger_id2: match.gambit._id,
            };
            potentialReplies.push(replyData);
          }

          // Find a reply for the match.
          filterRepliesByFunction(potentialReplies, options, callback);
        });
      }
    );
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
const getReply = function getReply(messageObject, options, callback) {
  // This method can be called recursively.
  if (options.depth) {
    debug.verbose('Called Recursively', options.depth);
    if (options.depth >= 50) {
      console.error('getReply was called recursively 50 times - returning null reply.');
      return callback(null, null);
    }
  }

  // We already have a pre-set list of potential topics from directReply, respond or topicRedirect
  if (!_.isEmpty(options.pendingTopics)) {
    debug.verbose('Using pre-set topic list via directReply, respond or topicRedirect');
    debug.info('Topics to check: ', options.pendingTopics.map(topic => topic.name));
    afterFindPendingTopics(options.pendingTopics, messageObject, options, callback);
  } else {
    const chatSystem = options.system.chatSystem;

    // Find potential topics for the response based on the message (tfidfs)
    chatSystem.Topic.findPendingTopicsForUser(options.user, messageObject, (err, pendingTopics) => {
      if (err) {
        console.log(err);
      }
      afterFindPendingTopics(pendingTopics, messageObject, options, callback);
    });
  }
};

const afterFindPendingTopics = function afterFindPendingTopics(pendingTopics, messageObject, options, callback) {
  debug.verbose(`Found pending topics/conversations: ${JSON.stringify(pendingTopics)}`);

  // We use map here because it will bail on error.
  // The error is our escape hatch when we have a reply WITH data.
  async.mapSeries(
    pendingTopics,
    topicItorHandle(messageObject, options),
    (err, results) => {
      if (err) {
        console.error(err);
      }

      // Remove the empty topics, and flatten the array down.
      let matches = _.flatten(_.filter(results, n => n));

      // TODO - This sort should happen in the process sort logic.
      // Let's sort the matches by qType.length
      matches = matches.sort((a, b) =>
         a.gambit.qType.length < b.gambit.qType.length
      );

      debug.verbose(`Matching gambits are: ${matches}`);

      // Was `eachSeries`
      async.mapSeries(matches, matchItorHandle(messageObject, options), afterHandle(options.user, callback));
    }
  );
};

export default getReply;
