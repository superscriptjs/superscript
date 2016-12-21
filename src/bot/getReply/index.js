/* eslint-disable no-use-before-define */

import _ from 'lodash';
import debuglog from 'debug-levels';

import Utils from '../utils';
import processTags from '../processTags';

import getPendingTopics from './getPendingTopics';
import filterRepliesByFunction from './filterFunction';
import filterRepliesBySeen from './filterSeen';
import processReplyTags from './processReplyTags';

import helpers from './helpers';

const debug = debuglog('SS:GetReply');

/**
 * The real craziness to retreive a reply.
 * @param {Object} messageObject - The instance of the Message class for the user input.
 * @param {Object} options.system - The system.
 * @param {Object} options.user - The user.
 * @param {Number} options.depth - The depth of how many times this function has been recursively called.
 * @param {Array} options.pendingTopics - A list of topics that have been specified to specifically search (usually via topicRedirect etc).
 * @param {Function} callback - Callback function once the reply has been found.
 */
const getReply = async function getReply(messageObject, options, callback) {
  if (options.depth) {
    debug.verbose('Called recursively', options.depth);
    if (options.depth >= 20) {
      console.error('getReply was called recursively 20 times - returning null reply.');
      return callback(null, null);
    }
  }

  let matches = [];
  try {
    const pendingTopics = await getPendingTopics(messageObject, options);
    matches = await findMatches(pendingTopics, messageObject, options);
  } catch (err) {
    console.error(err);
  }

  afterHandle(options.user, callback)(null, matches);
};

const findMatches = async function findMatches(pendingTopics, messageObject, options) {
  debug.verbose(`Found pending topics/conversations: ${JSON.stringify(pendingTopics)}`);

  const replies = [];
  let stopSearching = false;

  // We use a for loop here because we can break on finding a reply.
  // The error is our escape hatch when we have a reply WITH data.
  for (let i = 0; i < pendingTopics.length && !stopSearching; ++i) {
    const topic = pendingTopics[i];
    let unfilteredMatches = await topicItorHandle(topic, messageObject, options);

    // Remove the empty topics, and flatten the array down.
    unfilteredMatches = _.flatten(_.filter(unfilteredMatches, n => n));

    debug.info('Matching unfiltered gambits are: ');
    unfilteredMatches.forEach((match) => {
      debug.info(`Trigger: ${match.gambit.input}`);
      debug.info(`Replies: ${match.gambit.replies.map(reply => reply.reply).join('\n')}`);
    });

    for (let j = 0; j < unfilteredMatches.length && !stopSearching; ++j) {
      const match = unfilteredMatches[j];
      const reply = await matchItorHandle(match, messageObject, options);

      if (!_.isEmpty(reply)) {
        if (reply.continueMatching === false) {
          debug.info('Continue matching is set to false: returning.');
          stopSearching = true;
          replies.push(reply);
        } else if (reply.continueMatching === true || reply.reply.reply === '') {
          debug.info('Continue matching is set to true or reply is empty: continuing.');
          replies.push(reply);
        } else {
          debug.info('Reply is not empty: returning.');
          stopSearching = true;
          replies.push(reply);
        }
      }
    }
  }

  return replies;
};

// Topic iterator, we call this on each topic or conversation reply looking for a match.
// All the matches are stored and returned in the callback.
const topicItorHandle = async function topicItorHandle(topicData, messageObject, options) {
  const system = options.system;

  if (topicData.type === 'TOPIC') {
    const topic = await system.chatSystem.Topic.findById(topicData.id).populate('gambits');
    if (topic) {
      // We do realtime post processing on the input against the user object
      if (topic.filter) {
        debug.verbose(`Topic filter function found: ${topic.filter}`);

        const filterScope = _.merge({}, system.scope);
        filterScope.user = options.user;
        filterScope.message = messageObject;
        filterScope.topic = topic;
        filterScope.message_props = options.system.extraScope;

        return await new Promise((resolve, reject) => {
          Utils.runPluginFunc(topic.filter, filterScope, system.plugins, async (err, filterReply) => {
            if (err) {
              return reject(err);
            }
            if (filterReply === 'true' || filterReply === true) {
              return resolve(false);
            }
            options.topic = topic.name;
            const gambits = await helpers.findMatchingGambitsForMessage(options.system.chatSystem, 'topic', topic._id, messageObject, options);
            resolve(gambits);
          });
        });
      }

      options.topic = topic.name;
      return await helpers.findMatchingGambitsForMessage(options.system.chatSystem, 'topic', topic._id, messageObject, options);
    }
    // We call back if there is no topic Object
    // Non-existant topics return false
    return false;
  } else if (topicData.type === 'REPLY') {
    const reply = await system.chatSystem.Reply.findById(topicData.id).populate('gambits');
    debug.verbose('Conversation reply thread: ', reply);
    if (reply) {
      return await helpers.findMatchingGambitsForMessage(options.system.chatSystem, 'reply', reply._id, messageObject, options);
    }
    return false;
  }

  debug.verbose("We shouldn't hit this! 'topicData.type' should be 'TOPIC' or 'REPLY'");
  return false;
};

// Iterates through matched gambits
const matchItorHandle = async function matchItorHandle(match, message, options) {
  const system = options.system;
  options.message = message;

  debug.verbose('Match itor: ', match.gambit);

  // In some edge cases, replies were not being populated...
  // Let's do it here
  const gambitExpanded = await system.chatSystem.Gambit.findById(match.gambit._id)
    .populate('replies');

  match.gambit = gambitExpanded;

  const topic = await helpers.getRootTopic(match.gambit, system.chatSystem);

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
  let filtered = await filterRepliesByFunction({ potentialReplies, replyOptions }, options);
  filtered = await filterRepliesBySeen({ filteredReplies: filtered, replyOptions }, options);
  return processReplyTags(filtered, options);

  /*
    if (err) {
      // debug.error(err);
      // Keep looking for results
      // Invoking callback with no arguments ensure mapSeries carries on looking at matches from other gambits
      // callback();
    }
    return resolve(replyObj);
  */
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

export default getReply;
