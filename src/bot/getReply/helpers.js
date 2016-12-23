import _ from 'lodash';
import async from 'async';
import debuglog from 'debug-levels';
import safeEval from 'safe-eval';

import postParse from '../postParse';
import Utils from '../utils';

const debug = debuglog('SS:Helpers');

// This will find all the gambits to process by parent (topic or conversation)
// and return ones that match the message
const findMatchingGambitsForMessage = async function findMatchingGambitsForMessage(type, id, message, options) {
  let gambitsParent = {};
  const chatSystem = options.system.chatSystem;

  if (type === 'topic') {
    debug.verbose('Looking back Topic', id);
    gambitsParent = await chatSystem.Topic.findById(id, 'gambits')
      .populate({ path: 'gambits', populate: { path: 'replies' } });
  } else if (type === 'reply') {
    options.topic = 'reply';
    debug.verbose('Looking back at Conversation', id);
    gambitsParent = await chatSystem.Reply.findById(id, 'gambits')
      .populate({ path: 'gambits', populate: { path: 'replies' } });
  } else {
    throw new Error('We should never get here');
  }

  const matches = await new Promise((resolve, reject) => {
    async.map(gambitsParent.gambits, eachGambitHandle(message, options), (err3, matches) => {
      resolve(matches);
    });
  });

/*
  const matches = await Promise.all(gambitsParent.gambits.map(async (gambit) => {
    const match = await eachGambitHandle(gambit, message, options);
    return match;
  }));
  */

  return _.flatten(matches);
};


const processStars = function processStars(match, gambit, topic, cb) {
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
  } else if (gambit.isQuestion === false || gambit.isQuestion === null) {
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
    .populate('gambits');

  return await Promise.all(topic.gambits.map(async (gambit) => {
    const match = await doesMatch(gambit, message, options);
    return match;
  }));
};

// This is the main function that looks for a matching entry
const eachGambitHandle = function eachGambitHandle(message, options) {
  // This takes a gambit that is a child of a topic or reply and checks if
  // it matches the user's message or not.
  return (gambit, callback) => {
    const plugins = options.system.plugins;
    const scope = options.system.scope;
    const topic = options.topic || 'reply';
    const chatSystem = options.system.chatSystem;

    doesMatch(gambit, message, options).then((match) => {
      if (!match) {
        debug.verbose('Gambit trigger does not match input.');
        return callback(null, []);
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

        Utils.runPluginFunc(gambit.filter, filterScope, plugins, (err, filterReply) => {
          if (err) {
            console.error(err);
            return callback(null, []);
          }

          debug.verbose(`Reply from filter function was: ${filterReply}`);

          if (filterReply === 'true' || filterReply === true) {
            if (gambit.redirect !== '') {
              debug.verbose('Found Redirect Match with topic %s', topic);
              chatSystem.Topic.findTriggerByTrigger(gambit.redirect, (err2, trigger) => {
                if (err2) {
                  console.error(err2);
                }

                gambit = trigger;
                callback(null, []);
              });
            } else {
              // Tag the message with the found Trigger we matched on
              message.gambitId = gambit._id;
              processStars(match, gambit, topic, callback);
            }
          } else {
            callback(null, []);
          }
        });
      } else if (gambit.redirect !== '') {
          // If there's no filter, check if there's a redirect
          // TODO: Check this works/is sane
        debug.verbose('Found Redirect Match with topic');
        chatSystem.Topic.findTriggerByTrigger(gambit.redirect, (err, trigger) => {
          if (err) {
            console.log(err);
          }

          debug.verbose('Redirecting to New Gambit', trigger);
          gambit = trigger;
            // Tag the message with the found Trigger we matched on
          message.gambitId = gambit._id;
          processStars(match, gambit, topic, callback);
        });
      } else {
          // Tag the message with the found Trigger we matched on
        message.gambitId = gambit._id;
        processStars(match, gambit, topic, callback);
      }
    }); // end regexReply
  };
};

const walkGambitParent = async function walkGambitParent(gambitId, chatSystem) {
  const gambitIds = [];
  try {
    const gambit = await chatSystem.Gambit.findById(gambitId).populate('parent');
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
    const reply = await chatSystem.Reply.findById(replyId).populate('parent');
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
    return await chatSystem.Topic.findOne({ gambits: { $in: [gambit._id] } });
  }

  const gambits = await walkGambitParent(gambit._id, chatSystem);
  if (gambits.length !== 0) {
    return await chatSystem.Topic.findOne({ gambits: { $in: [gambits.pop()] } });
  }

  return await chatSystem.Topic.findOne({ name: 'random' });
};

export default {
  findMatchingGambitsForMessage,
  getRootTopic,
  walkReplyParent,
};
