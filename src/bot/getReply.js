import _ from 'lodash';
import debuglog from 'debug-levels';
import async from 'async';

import Utils from './utils';
import processTags from './processTags';

const debug = debuglog('SS:GetReply');

// Topic iterator, we call this on each topic or conversation reply looking for a match.
// All the matches are stored and returned in the callback.
const topicItorHandle = function topicItorHandle(messageObject, options) {
  const system = options.system;

  return (topicData, callback) => {
    if (topicData.type === 'TOPIC') {
      system.chatSystem.Topic.findById(topicData.id)
        .populate('gambits')
        .exec((err, topic) => {
          if (err) {
            console.error(err);
          }
          if (topic) {
            // We do realtime post processing on the input against the user object
            if (topic.filter) {
              debug.verbose(`Topic filter function found: ${topic.filter}`);

              const filterScope = _.merge({}, system.scope);
              filterScope.user = options.user;
              filterScope.message = messageObject;
              filterScope.topic = topic;
              filterScope.message_props = options.system.extraScope;

              Utils.runPluginFunc(topic.filter, filterScope, system.plugins, (err, filterReply) => {
                if (err) {
                  console.error(err);
                  return topic.findMatch(messageObject, options, callback);
                }
                if (filterReply === 'true' || filterReply === true) {
                  return callback(null, false);
                }
                return topic.findMatch(messageObject, options, callback);
              });
            } else {
              // We look for a match in the topic.
              topic.findMatch(messageObject, options, callback);
            }
          } else {
            // We call back if there is no topic Object
            // Non-existant topics return false
            callback(null, false);
          }
        },
      );
    } else if (topicData.type === 'REPLY') {
      system.chatSystem.Reply.findById(topicData.id)
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
        },
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
  return (continueSearching, matchSet) => {
    debug.verbose(`Continue searching: ${continueSearching}`);
    debug.verbose(`Set of matches: ${matchSet}`);

    // remove empties
    matchSet = _.compact(matchSet);

    const minMatchSet = [];
    let props = {};
    let clearConversation = false;
    let lastTopicToMatch = null;
    let lastStarSet = null;
    let lastReplyId = null;
    let replyString = '';
    let lastSubReplies = null;
    let lastContinueMatching = null;
    let lastReplyIds = null;

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
        if (replyString === '') {
          replyString += `${item.reply.reply}`;
        } else {
          replyString += ` ${item.reply.reply}`;
        }
      }

      props = _.assign(props, item.props);
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

    let threadsArr = [];
    if (_.isEmpty(lastSubReplies)) {
      threadsArr = processTags.processThreadTags(replyString);
    } else {
      threadsArr[0] = replyString;
      threadsArr[1] = lastSubReplies;
    }

    const cbdata = {
      replyId: lastReplyId,
      replyIds: lastReplyIds,
      props,
      clearConversation,
      topicName: lastTopicToMatch,
      minMatchSet,
      string: threadsArr[0],
      subReplies: threadsArr[1],
      stars: lastStarSet,
      continueMatching: lastContinueMatching,
    };

    debug.verbose('afterHandle', cbdata);

    callback(null, cbdata);
  };
};

// This may be called several times, once for each topic.
// filteredResults
const filterRepliesBySeen = function filterRepliesBySeen(replyData, options, callback) {
  const filteredResults = replyData.filteredReplies;
  const replyOptions = replyData.replyOptions;
  const system = options.system;
  const pickScheme = replyOptions.order;
  const keepScheme = replyOptions.keep;

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
          const topicItem = options.user.history.topic[i];

          if (topicItem !== undefined) {
            // TODO: Come back to this and check names make sense
            const pastGambit = options.user.history.reply[i];
            const pastInput = options.user.history.input[i];

            // Sometimes the history has null messages because we spoke first.
            if (pastGambit && pastInput) {
              // Do they match and not have a keep flag

              debug.verbose('--------------- FILTER SEEN ----------------');
              debug.verbose('Past replyId', pastGambit.replyId);
              debug.verbose('Current replyId', replyId);
              debug.verbose('Past gambitId', String(pastInput.gambitId));
              debug.verbose('Current gambitId', String(gambitId));
              debug.verbose('reply.keep', reply.keep);
              debug.verbose('currentTopic.reply_exhaustion', currentTopic.reply_exhaustion);
              debug.verbose('gambit keepScheme', keepScheme);

              if (String(replyId) === String(pastGambit.replyId) &&
                // TODO: For conversation threads this should be disabled because we are looking
                // the wrong way.
                // But for forward threads it should be enabled.
                // String(pastInput.gambitId) === String(inputId) &&
                reply.keep === false &&
                currentTopic.reply_exhaustion !== "keep") {
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

  async.eachSeries(filteredResults, eachResultItor, () => {
    debug.verbose('Bucket of selected replies: ', bucket);
    debug.verbose('Pick Scheme:', pickScheme);
    if (!_.isEmpty(bucket)) {
      if (pickScheme === 'ordered') {
        const picked = bucket.shift();
        callback(null, picked);
      } else {
        // Random order
        callback(null, Utils.pickItem(bucket));
      }
    } else {
      callback(true);
    }
  });
}; // end filterBySeen

// replyData = {potentialReplies, replyOptions}
const filterRepliesByFunction = function filterRepliesByFunction(replyData, options, callback) {
  const potentialReplies = replyData.potentialReplies;
  const replyOptions = replyData.replyOptions;

  const filterHandle = function filterHandle(potentialReply, cb) {
    const system = options.system;

    // We support a single filter function in the reply
    // It returns true/false to aid in the selection.

    if (potentialReply.reply.filter) {
      const stars = { stars: potentialReply.stars };
      processTags.preprocess(potentialReply.reply.filter, stars, options, (err, cleanFilter) => {
        debug.verbose(`Reply filter function found: ${cleanFilter}`);

        const filterScope = _.merge({}, system.scope);
        filterScope.user = options.user;
        filterScope.message = options.message;
        filterScope.message_props = options.system.extraScope;

        Utils.runPluginFunc(cleanFilter, filterScope, system.plugins, (err, filterReply) => {
          if (err) {
            console.error(err);
            return cb(null, true);
          }

          if (filterReply === 'true' || filterReply === true) {
            return cb(null, true);
          }
          return cb(null, false);
        });
      });
    } else {
      cb(null, true);
    }
  };

  async.filterSeries(potentialReplies, filterHandle, (err, filteredReplies) => {
    debug.verbose('filterByFunction results: ', filteredReplies);

    filterRepliesBySeen({ filteredReplies, replyOptions }, options, (err, reply) => {
      // At this point we just have one reply
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

          const replyOptions = {
            keep: match.gambit.reply_exhaustion,
            order: match.gambit.reply_order,
          };

          // Find a reply for the match.
          filterRepliesByFunction({ potentialReplies, replyOptions }, options, callback);
        });
      },
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
    if (options.depth >= 20) {
      console.error('getReply was called recursively 20 times - returning null reply.');
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
      const matches = _.flatten(_.filter(results, n => n));

      debug.info('Matching gambits are: ');
      matches.forEach((match) => {
        debug.info(`Trigger: ${match.gambit.input}`);
        debug.info(`Replies: ${match.gambit.replies.map(reply => reply.reply).join('\n')}`);
      });

      async.mapSeries(matches, matchItorHandle(messageObject, options), afterHandle(options.user, callback));
    },
  );
};

export default getReply;
