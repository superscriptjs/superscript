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

  const data = afterHandle(matches);
  // One day, everything will be async/await and everything will be happy. Until
  // then, catch exceptions in the callback and throw them at top-level on next tick.
  try {
    return callback(null, data);
  } catch (err) {
    process.nextTick(() => { throw err; });
  }
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
        replies.push(reply);
        if (reply.continueMatching === false) {
          debug.info('Continue matching is set to false: returning.');
          stopSearching = true;
        } else if (reply.continueMatching === true || reply.reply.reply === '') {
          debug.info('Continue matching is set to true or reply is empty: continuing.');
        } else {
          debug.info('Reply is not empty: returning.');
          stopSearching = true;
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
            const gambits = await helpers.findMatchingGambitsForMessage('topic', topic._id, messageObject, options);
            resolve(gambits);
          });
        });
      }

      options.topic = topic.name;
      return await helpers.findMatchingGambitsForMessage('topic', topic._id, messageObject, options);
    }
    // We call back if there is no topic Object
    // Non-existant topics return false
    return false;
  } else if (topicData.type === 'REPLY') {
    const reply = await system.chatSystem.Reply.findById(topicData.id).populate('gambits');
    debug.verbose('Conversation reply thread: ', reply);
    if (reply) {
      return await helpers.findMatchingGambitsForMessage('reply', reply._id, messageObject, options);
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

  const topic = await helpers.getRootTopic(match.gambit, system.chatSystem);

  let stars = match.stars;
  if (!_.isEmpty(message.stars)) {
    stars = message.stars;
  }

  const potentialReplies = [];

  for (let i = 0; i < match.gambit.replies.length; i++) {
    const reply = match.gambit.replies[i];
    const replyData = {
      id: reply.id,
      topic: topic.name,
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
  let filtered = await filterRepliesByFunction(potentialReplies, options);
  filtered = await filterRepliesBySeen(filtered, options);

  const pickScheme = match.gambit.reply_order;

  debug.verbose('Filtered Results', filtered);
  debug.verbose('Pick Scheme:', pickScheme);

  debug.verbose('Default Keep', options.system.defaultKeepScheme);
  debug.verbose('Topic Keep', topic.reply_exhaustion);
  debug.verbose('Gambit Keep', match.gambit.reply_exhaustion);

  let keepScheme = options.system.defaultKeepScheme;
  if (match.gambit.reply_exhaustion) {
    keepScheme = match.gambit.reply_exhaustion;
  } else if (topic.reply_exhaustion) {
    keepScheme = topic.reply_exhaustion;
  }

  let filteredNew = [];
  debug.verbose('Using KeepScheme', keepScheme);

  if (keepScheme === 'exhaust' || keepScheme === 'reload') {
    filteredNew = _.filter(filtered, reply => reply.seenCount === 0 || reply.reply.keep);
  }

  // We reload the replies if we have nothing else to show.
  if (keepScheme === 'reload' && _.isEmpty(filteredNew)) {
    debug.verbose('Reloading Replies');
    filteredNew = filtered;
  } else if (keepScheme === 'keep') {
    filteredNew = filtered;
  }

  // Orderd or Random
  const picked = (pickScheme === 'ordered') ? filteredNew.shift() : Utils.pickItem(filteredNew);

  // If we have an item lets use it, otherwise retutn null and keep matching.
  debug.verbose('Picked', picked);
  return picked ? processReplyTags(picked, options) : null;
};

const afterHandle = function afterHandle(matches) {
  debug.verbose(`Set of matches: ${matches}`);

  const debugAll = [];
  let props = {};
  let clearConversation = false;
  let lastTopicToMatch = null;
  let lastStarSet = null;
  let lastReplyId = null;
  let replyString = '';
  let lastSubReplies = null;
  let lastContinueMatching = null;
  let lastReplyIds = null;

  matches.forEach((match) => {
    const debugMatch = {
      topic: match.matched_topic_string || match.topic,
      input: match.trigger,
      reply: match.matched_reply_string,
    };

    if (!_.isEmpty(match.debug)) {
      debugMatch.subset = match.debug;
    } else {
      debugMatch.output = match.reply.reply;
    }

    debugAll.push(debugMatch);

    if (match.reply && match.reply.reply) {
      if (replyString === '') {
        replyString += `${match.reply.reply}`;
      } else {
        replyString += ` ${match.reply.reply}`;
      }
    }

    props = _.assign(props, match.props);
    lastTopicToMatch = match.topic;
    lastStarSet = match.stars;
    lastReplyId = match.reply._id;
    lastSubReplies = match.subReplies;
    lastContinueMatching = match.continueMatching;
    lastReplyIds = match.replyIds;

    if (match.clearConversation) {
      clearConversation = match.clearConversation;
    }
  });

  let threadsArr = [];
  if (_.isEmpty(lastSubReplies)) {
    threadsArr = processTags.processThreadTags(replyString);
  } else {
    threadsArr[0] = replyString;
    threadsArr[1] = lastSubReplies;
  }

  const data = {
    replyId: lastReplyId,
    replyIds: lastReplyIds,
    props,
    clearConversation,
    topicName: lastTopicToMatch,
    debug: debugAll,
    string: threadsArr[0],
    subReplies: threadsArr[1],
    stars: lastStarSet,
    continueMatching: lastContinueMatching,
  };

  debug.verbose('afterHandle', data);

  return data;
};

export default getReply;
