// These are shared helpers for the models.

import async from 'async';
import _ from 'lodash';
import debuglog from 'debug-levels';
import safeEval from 'safe-eval';

import modelNames from './modelNames';
import Utils from '../utils';
import postParse from '../postParse';

const debug = debuglog('SS:Common');

const _walkGambitParent = function _walkGambitParent(db, tenantId, gambitId, gambitIds, cb) {
  db.model(modelNames.gambit).byTenant(tenantId).findById(gambitId)
    .populate('parent')
    .exec((err, gambit) => {
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
const findMatchingGambitsForMessage = function findMatchingGambitsForMessage(db, tenantId, type, id, message, options, callback) {
  // Let's query for Gambits
  const execHandle = function execHandle(err, gambitsParent) {
    if (err) {
      console.error(err);
    }

    async.map(gambitsParent.gambits, eachGambitHandle(message, options), (err3, matches) => {
      callback(null, _.flatten(matches));
    });
  };

  if (type === 'topic') {
    debug.verbose('Looking back Topic', id);
    db.model(modelNames.topic).byTenant(tenantId).findById(id, 'gambits')
      .populate({ path: 'gambits', populate: { path: 'replies' } })
      .exec(execHandle);
  } else if (type === 'reply') {
    options.topic = 'reply';
    debug.verbose('Looking back at Conversation', id);
    db.model(modelNames.reply).byTenant(tenantId).findById(id, 'gambits')
      .populate({ path: 'gambits', populate: { path: 'replies' } })
      .exec(execHandle);
  } else {
    debug.verbose('We should never get here');
    callback(true);
  }
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
const doesMatch = function doesMatch(gambit, message, options, callback) {
  if (gambit.conditions && gambit.conditions.length > 0) {
    const conditionsMatch = processConditions(gambit.conditions, options);
    if (!conditionsMatch) {
      debug.verbose('Conditions did not match');
      callback(null, false);
      return;
    }
  }

  let match = false;

  // Replace <noun1>, <adverb1> etc. with the actual words in user message
  postParse(gambit.trigger, message, options.user, (regexp) => {
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

    callback(null, match);
  });
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

    doesMatch(gambit, message, options, (err, match) => {
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
}; // end EachGambit

const walkGambitParent = (db, tenantId, gambitId, cb) => {
  _walkGambitParent(db, tenantId, gambitId, [], cb);
};

export default {
  walkGambitParent,
  doesMatch,
  findMatchingGambitsForMessage,
};
