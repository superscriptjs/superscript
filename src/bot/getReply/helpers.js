import _ from 'lodash';
import debuglog from 'debug-levels';
import safeEval from 'safe-eval';

import postParse from '../postParse';
import Utils from '../utils';

const debug = debuglog('SS:Helpers');

// This will find all the gambits to process by parent (topic or conversation)
// and return ones that match the message
const findMatchingGambitsForMessage = async function findMatchingGambitsForMessage(type, parent, message, options) {
  const matches = await Promise.all(parent.gambits.map(async (gambit) => {
    const match = await eachGambitHandle(gambit, message, options);
    return match;
  }));

  return _.flatten(matches);
};


const processStars = function processStars(match, gambit, topic) {
  debug.verbose(`Match found: ${gambit.input} in topic: ${topic}`);
  const stars = [];
  if (match.length > 1) {
    for (let j = 1; j < match.length; j++) {
      if (match[j]) {
        let starData = Utils.trim(match[j]);
        // Concepts are not allowed to be stars or captured input.
        starData = (starData[0] === '~') ? starData.substr(1) : starData;
        stars.push(starData);
      }
    }
  }

  const data = { stars, gambit };
  if (topic !== 'reply') {
    data.topic = topic;
  }

  const matches = [data];
  return matches;
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
const processConditions = function processConditions(conditions, options) {
  const context = options.user.conversationState || {};

  return _.every(conditions, (condition) => {
    debug.verbose('Check condition - Context: ', context);
    debug.verbose('Check condition - Condition: ', condition);

    try {
      const result = safeEval(condition, context);
      if (result) {
        debug.verbose('--- Condition TRUE ---');
        return true;
      }
      debug.verbose('--- Condition FALSE ---');
      return false;
    } catch (e) {
      debug.verbose(`Error in condition checking: ${e.stack}`);
      return false;
    }
  });
};

/**
 * Takes a gambit and a message, and returns non-null if they match.
 */
export const doesMatch = async function doesMatch(gambit, message, options) {
  if (gambit.conditions && gambit.conditions.length > 0) {
    const conditionsMatch = processConditions(gambit.conditions, options);
    if (!conditionsMatch) {
      debug.verbose('Conditions did not match');
      return false;
    }
  }

  let match = false;

  // Replace <noun1>, <adverb1> etc. with the actual words in user message
  const regexp = postParse(gambit.trigger, message, options.user);

  const pattern = new RegExp(`^${regexp}$`, 'i');

  debug.verbose(`Try to match (clean)'${message.clean}' against '${gambit.trigger}' (${pattern})`);
  debug.verbose(`Try to match (lemma)'${message.lemString}' against '${gambit.trigger}' (${pattern})`);

  // Match on isQuestion
  if (gambit.isQuestion && message.isQuestion) {
    debug.verbose('Gambit and message are questions, testing against question types');
    match = message.clean.match(pattern);
    if (!match) {
      match = message.lemString.match(pattern);
    }
  } else if (!gambit.isQuestion) {
    match = message.clean.match(pattern);
    if (!match) {
      match = message.lemString.match(pattern);
    }
  }

  debug.verbose(`Match at the end of doesMatch was: ${match}`);

  return match;
};

// TODO: This only exists for testing, ideally we should get rid of this
export const doesMatchTopic = async function doesMatchTopic(topicName, message, options) {
  const topic = await options.chatSystem.Topic.findOne({ name: topicName }, 'gambits')
    .populate('gambits')
    .lean()
    .exec();

  return Promise.all(topic.gambits.map(async gambit => (
    doesMatch(gambit, message, options)
  )));
};

// This is the main function that looks for a matching entry
// This takes a gambit that is a child of a topic or reply and checks if
// it matches the user's message or not.
const eachGambitHandle = async function eachGambitHandle(gambit, message, options) {
  const plugins = options.system.plugins;
  const scope = options.system.scope;
  const topic = options.topic || 'reply';
  const chatSystem = options.system.chatSystem;

  const match = await doesMatch(gambit, message, options);
  if (!match) {
    return [];
  }

  // A filter is syntax that calls a plugin function such as:
  // - {^functionX(true)} Yes, you are.
  if (gambit.filter) {
    debug.verbose(`We have a filter function: ${gambit.filter}`);

    // The filterScope is what 'this' is during the execution of the plugin.
    // This is so you can write plugins that can access, e.g. this.user or this.chatSystem
    // Here we augment the global scope (system.scope) with any additional local scope for
    // the current reply.
    const filterScope = _.merge({}, scope);
    filterScope.message = message;
    // filterScope.message_props = options.localOptions.messageScope;
    filterScope.user = options.user;

    let filterReply;
    try {
      [filterReply] = await Utils.runPluginFunc(gambit.filter, filterScope, plugins);
    } catch (err) {
      console.error(err);
      return [];
    }

    debug.verbose(`Reply from filter function was: ${filterReply}`);

    if (filterReply !== 'true' && filterReply !== true) {
      debug.verbose('Gambit is not matched since the filter function returned false');
      return [];
    }
  }

  if (gambit.redirect !== '') {
    debug.verbose('Gambit has a redirect', topic);
    // FIXME: ensure this works
    const redirectedGambit = await chatSystem.Gambit.findOne({ input: gambit.redirect })
      .populate({ path: 'replies' })
      .lean()
      .exec();
    return processStars(match, redirectedGambit, topic);
  }

  // Tag the message with the found Trigger we matched on
  message.gambitId = gambit._id;
  return processStars(match, gambit, topic);
};

const walkGambitParent = async function walkGambitParent(gambitId, chatSystem) {
  const gambitIds = [];
  try {
    const gambit = await chatSystem.Gambit.findById(gambitId, '_id parent')
      .populate('parent')
      .lean()
      .exec();
    debug.verbose('Walk', gambit);

    if (gambit) {
      gambitIds.push(gambit._id);
      if (gambit.parent && gambit.parent.parent) {
        const parents = await walkGambitParent(gambit.parent.parent, chatSystem);
        return gambitIds.concat(parents);
      }
    }
  } catch (err) {
    console.error(err);
  }
  return gambitIds;
};

const walkReplyParent = async function walkReplyParent(replyId, chatSystem) {
  const replyIds = [];
  try {
    const reply = await chatSystem.Reply.findById(replyId, '_id parent')
      .populate('parent')
      .lean()
      .exec();
    debug.verbose('Walk', reply);

    if (reply) {
      replyIds.push(reply._id);
      if (reply.parent && reply.parent.parent) {
        const parents = await walkReplyParent(reply.parent.parent, chatSystem);
        return replyIds.concat(parents);
      }
    }
  } catch (err) {
    console.error(err);
  }
  return replyIds;
};

const getRootTopic = async function getRootTopic(gambit, chatSystem) {
  if (!gambit.parent) {
    return chatSystem.Topic.findOne({ gambits: { $in: [gambit._id] } }).lean().exec();
  }

  const gambits = await walkGambitParent(gambit._id, chatSystem);
  if (gambits.length !== 0) {
    return chatSystem.Topic.findOne({ gambits: { $in: [gambits.pop()] } }).lean().exec();
  }

  return chatSystem.Topic.findOne({ name: 'random' }).lean().exec();
};

export default {
  findMatchingGambitsForMessage,
  getRootTopic,
  walkReplyParent,
};
