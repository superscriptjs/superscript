// These are shared helpers for the models.

import async from 'async';
import _ from 'lodash';
import debuglog from 'debug-levels';

import Utils from '../utils';
import postParse from '../postParse';

const debug = debuglog('SS:Common');

const _walkReplyParent = function _walkReplyParent(db, replyId, replyIds, cb) {
  db.model('Reply').findById(replyId)
    .populate('parent')
    .exec((err, reply) => {
      if (err) {
        debug.error(err);
      }

      debug.info('Walk', reply);

      if (reply) {
        replyIds.push(reply._id);
        if (reply.parent && reply.parent.parent) {
          _walkReplyParent(db, reply.parent.parent, replyIds, cb);
        } else {
          cb(null, replyIds);
        }
      } else {
        cb(null, replyIds);
      }
    });
};

const _walkGambitParent = function _walkGambitParent(db, gambitId, gambitIds, cb) {
  db.model('Gambit').findOne({ _id: gambitId })
    .populate('parent')
    .exec((err, gambit) => {
      if (err) {
        console.log(err);
      }

      if (gambit) {
        gambitIds.push(gambit._id);
        if (gambit.parent && gambit.parent.parent) {
          _walkGambitParent(db, gambit.parent.parent, gambitIds, cb);
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
const findMatchingGambitsForMessage = function findMatchingGambitsForMessage(db, type, id, message, options, callback) {
  // Let's query for Gambits
  const execHandle = function execHandle(err, gambitsParent) {
    if (err) {
      console.error(err);
    }

    const populateGambits = function populateGambits(gambit, next) {
      debug.verbose('Populating gambit');
      db.model('Reply').populate(gambit, { path: 'replies' }, next);
    };

    async.each(gambitsParent.gambits, populateGambits, (err) => {
      debug.verbose('Completed populating gambits');
      if (err) {
        console.error(err);
      }
      async.map(gambitsParent.gambits,
        _eachGambitHandle(message, options),
        (err3, matches) => {
          callback(null, _.flatten(matches));
        }
      );
    });
  };

  if (type === 'topic') {
    debug.verbose('Looking back Topic', id);
    db.model('Topic').findOne({ _id: id }, 'gambits')
      .populate({ path: 'gambits', match: { isCondition: false } })
      .exec(execHandle);
  } else if (type === 'reply') {
    options.topic = 'reply';
    debug.verbose('Looking back at Conversation', id);
    db.model('Reply').findOne({ _id: id }, 'gambits')
      .populate({ path: 'gambits', match: { isCondition: false } })
      .exec(execHandle);
  } else if (type === 'condition') {
    debug.verbose('Looking back at Conditions', id);
    db.model('Condition').findOne({ _id: id }, 'gambits')
      .populate('gambits')
      .exec(execHandle);
  } else {
    debug.verbose('We should never get here');
    callback(true);
  }
};

const _afterHandle = function _afterHandle(match, gambit, topic, cb) {
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

/**
 * Takes a gambit (trigger) and a message, and returns non-null if they match.
 */
const doesMatch = function (gambit, message, options, callback) {
  let match = false;

  // Replace <noun1>, <adverb1> etc. with the actual words in user message
  postParse(gambit.trigger, message, options.user, (regexp) => {
    const pattern = new RegExp(`^${regexp}$`, 'i');

    debug.verbose(`Try to match (clean)'${message.clean}' against ${gambit.trigger} (${regexp})`);
    debug.verbose(`Try to match (lemma)'${message.lemString}' against ${gambit.trigger} (${regexp})`);

    // Match on the question type (qtype / qsubtype)
    if (gambit.isQuestion && message.isQuestion) {
      if (_.isEmpty(gambit.qSubType) && _.isEmpty(gambit.qType) && message.isQuestion === true) {
        match = message.clean.match(pattern);
        if (!match) {
          match = message.lemString.match(pattern);
        }
      } else {
        if ((!_.isEmpty(gambit.qType) && message.questionType.indexOf(gambit.qType) !== -1) ||
          message.questionSubType === gambit.qSubType) {
          match = message.clean.match(pattern);
          if (!match) {
            match = message.lemString.match(pattern);
          }
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

    debug.verbose(`Match at the end of doesMatch was: ${match}`);

    callback(null, match);
  });
};

// This is the main function that looks for a matching entry
const _eachGambitHandle = function (message, options) {
  const filterRegex = /\s*\^(\w+)\(([\w<>,\|\s]*)\)\s*/i;

  // This takes a gambit that is a child of a topic, reply or condition and checks if
  // it matches the user's message or not.
  return function (gambit, callback) {
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
      if (gambit.filter !== '') {
        debug.verbose(`We have a filter function: ${gambit.filter}`);

        const filterFunction = gambit.filter.match(filterRegex);
        debug.verbose(`Filter function matched against regex gave: ${filterFunction}`);

        const pluginName = Utils.trim(filterFunction[1]);
        const parts = Utils.trim(filterFunction[2]).split(',');

        if (!plugins[pluginName]) {
          debug.verbose('Custom Filter Function not-found', pluginName);
          callback(null, []);
        }

        // These are the arguments to the function (cleaned version of parts)
        const args = [];
        for (let i = 0; i < parts.length; i++) {
          if (parts[i] !== '') {
            args.push(parts[i].trim());
          }
        }

        if (plugins[pluginName]) {
          // The filterScope is what 'this' is during the execution of the plugin.
          // This is so you can write plugins that can access, e.g. this.user or this.chatSystem
          // Here we augment the global scope (system.scope) with any additional local scope for
          // the current reply.
          const filterScope = _.merge({}, scope);
          filterScope.message = message;
//          filterScope.message_props = options.localOptions.messageScope;
          filterScope.user = options.user;

          args.push((err, filterReply) => {
            if (err) {
              console.error(err);
            }

            debug.verbose(`Reply from filter function was: ${filterReply}`);

            // TODO: This seems weird... Investigate
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
                _afterHandle(match, gambit, topic, callback);
              }
            } else {
              callback(null, []);
            }
          });

          debug.verbose('Calling Plugin Function', pluginName);
          plugins[pluginName].apply(filterScope, args);
        }
      } else {
        if (gambit.redirect !== '') {
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
            _afterHandle(match, gambit, topic, callback);
          });
        } else {
          // Tag the message with the found Trigger we matched on
          message.gambitId = gambit._id;
          _afterHandle(match, gambit, topic, callback);
        }
      }
    }); // end regexReply
  };
}; // end EachGambit

const walkReplyParent = (db, replyId, cb) => {
  _walkReplyParent(db, replyId, [], cb);
};

const walkGambitParent = (db, gambitId, cb) => {
  _walkGambitParent(db, gambitId, [], cb);
};

export default {
  walkReplyParent,
  walkGambitParent,
  doesMatch,
  findMatchingGambitsForMessage,
};
