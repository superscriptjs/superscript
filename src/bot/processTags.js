// TODO: Fix this documentation, options is incorrect
/**
 * Parse the reply for additional tags, this is called once we have a reply candidate filtered out.
 *
 * @param {Object} replyObj - The Reply Object
 * @param {string} replyObj.id - This is the 8 digit id mapping back to the ss parsed json
 * @param {array} replyObj.stars - All of the matched values
 * @param {string} replyObj.topic - The Topic name we matched on
 * @param {Object} replyObj.reply - This is the Mongo Reply Gambit
 * @param {string} replyObj.trigger - The input string of the gambit the user matched with their message
 * @param {string} replyObj.trigger_id - The trigger id (8 digit)
 * @param {string} replyObj.trigger_id2 - The trigger id (mongo id)
 *
 * @param {Object} options
 * @param {Object} options.user - The user object
 * @param {Object} options.system - Extra cached items that are loaded async during load-time
 * @param {Object} options.message - The original message object
 *
 * @param {array} options.system.plugins - An array of plugins loaded from the plugin folder
 * @param {Object} options.system.scope - All of the data available to `this` inside of the plugin during execution
 * @param {number} options.depth - Counter of how many times this function is called recursively.
 *
 * Replies can have the following:
 * Basic (captured text) subsitution ie: `I like <cap1>`
 * Input (parts of speech) subsitution ie: `I like <noun>`
 * Expanding terms using wordnet ie: `I like ~sport`
 * Alternate terms to choose at random ie: `I like (baseball|hockey)`
 * Custom functions that can be called ie: `I like ^chooseSport()`
 * Redirects to another reply ie: `I like {@sport}`
 */

import _ from 'lodash';
import replace from 'async-replace';
import RE2 from 're2';
import debuglog from 'debug-levels';

import Utils from './utils';
import processHelpers from './reply/common';
import regexes from './regexes';

import inlineRedirect from './reply/inlineRedirect';
import topicRedirect from './reply/topicRedirect';
import respond from './reply/respond';
import customFunction from './reply/customFunction';

const debug = debuglog('SS:ProcessTags');

// xxx: RegExp instead of RE2 because it is passed to async-replace
const WORDNET_REGEX = /(~)(\w[\w]+)/g;

const processReplyTags = function processReplyTags(replyObj, options, callback) {
  const system = options.system;

  debug.verbose('Depth: ', options.depth);

  let replyString = replyObj.reply.reply;
  debug.info("Reply '%s'", replyString);

  // Let's set the currentTopic to whatever we matched on, providing it isn't already set
  // The reply text might override that later.
  if (_.isEmpty(options.user.pendingTopic)) {
    options.user.setTopic(replyObj.topic);
  }

  // If the reply has {topic=newTopic} syntax, get newTopic and the cleaned string.
  const { replyString: cleanedTopicReply, newTopic } = processHelpers.topicSetter(replyString);
  replyString = cleanedTopicReply;

  if (newTopic !== '') {
    debug.verbose('New topic found: ', newTopic);
    options.user.setTopic(newTopic);
  }

  // Appends replyObj.stars to stars
  const stars = [''];
  stars.push(...replyObj.stars);

  // Expand captures
  replyString = new RE2('<cap(\\d*)>', 'ig').replace(replyString, (match, param) => {
    const index = param ? Number.parseInt(param) : 1;
    return index < stars.length ? stars[index] : match;
  });

  // So this is to address GH-207, pulling the stars out of the history and
  // feeding them forward into new replies. It allows us to save a tiny bit of
  // context though a conversation cycle.
  const matches = regexes.pcaptures.match(replyString);
  if (matches) {
    // TODO: xxx: handle captures within captures, but only 1 level deep
    for (let i = 0; i < matches.length; i++) {
      const match = regexes.pcapture.match(matches[i]);
      const historyPtr = +match[1] - 1;
      const starPtr = +match[2] - 1;
      if (options.user.__history__.stars[historyPtr] && options.user.__history__.stars[historyPtr][starPtr]) {
        const term = options.user.__history__.stars[historyPtr][starPtr];
        replyString = replyString.replace(matches[i], term);
      } else {
        debug.verbose('Attempted to use previous capture data, but none was found in user history.');
      }
    }
  }

  // clean up the reply by unescaping newlines and hashes
  replyString = new RE2('\\\\(n|#)', 'ig')
    .replace(Utils.trim(replyString), (match, param) =>
       param === '#' ? '#' : '\n'
    );

  let clearConvoBit = false;
  // There SHOULD only be 0 or 1.
  const clearMatch = regexes.clear.match(replyString);
  if (clearMatch) {
    debug.verbose('Adding Clear Conversation Bit');
    replyString = replyString.replace(clearMatch[0], '');
    replyString = replyString.trim();
    clearConvoBit = true;
  }

  let mbit = null;
  const continueMatch = regexes.continue.match(replyString);
  if (continueMatch) {
    debug.verbose('Adding CONTINUE Conversation Bit');
    replyString = replyString.replace(continueMatch[0], '');
    replyString = replyString.trim();
    mbit = false;
  }

  const endMatch = regexes.end.match(replyString);
  if (endMatch) {
    debug.verbose('Adding END Conversation Bit');
    replyString = replyString.replace(endMatch[0], '');
    replyString = replyString.trim();
    mbit = true;
  }

  // <input> and <reply>
  // Special case, we have no items in the history yet.
  // This could only happen if we are trying to match the first input.
  // Kinda edgy.

  const message = options.message;
  if (!_.isNull(message)) {
    replyString = new RE2('<input>', 'ig').replace(replyString, message.clean);
  }

  replyString = new RE2('<(input|reply)([1-9]?)>', 'ig')
    .replace(replyString, (match, param1, param2) => {
      const data = param1 === 'input' ? options.user.__history__.input : options.user.__history__.reply;
      return data[param2 ? Number.parseInt(param2) - 1 : 0];
    });

  replace(replyString, WORDNET_REGEX, processHelpers.wordnetReplace, (err, wordnetReply) => {
    const originalReply = replyString;
    replyString = wordnetReply;

    // Inline redirector.
    const redirectMatch = regexes.redirect.match(replyString);
    const topicRedirectMatch = regexes.topic.match(replyString);
    let respondMatch = regexes.respond.match(replyString);
    const customFunctionMatch = regexes.customFn.match(replyString);

    let match = false;
    if (redirectMatch || topicRedirectMatch || respondMatch || customFunctionMatch) {
      const obj = [];
      obj.push({ name: 'redirectMatch', index: (redirectMatch) ? redirectMatch.index : -1 });
      obj.push({ name: 'topicRedirectMatch', index: (topicRedirectMatch) ? topicRedirectMatch.index : -1 });
      obj.push({ name: 'respondMatch', index: (respondMatch) ? respondMatch.index : -1 });
      obj.push({ name: 'customFunctionMatch', index: (customFunctionMatch) ? customFunctionMatch.index : -1 });

      match = _.result(_.find(_.sortBy(obj, 'index'), chr =>
         chr.index >= 0
      ), 'name');
      debug.verbose(`Augmenting function found: ${match}`);
    }

    const augmentCallbackHandle = function augmentCallbackHandle(err, replyString, messageProps, getReplyObject, mbit1) {
      if (err) {
        // If we get an error, we back out completely and reject the reply.
        debug.verbose('We got an error back from one of the handlers', err);
        return callback(err, {});
      } else {
        let newReplyObject;
        if (_.isEmpty(getReplyObject)) {
          newReplyObject = replyObj;
          newReplyObject.reply.reply = replyString;

          // This is a new bit to stop us from matching more.
          if (mbit !== null) {
            newReplyObject.breakBit = mbit;
          }
          // If the function has the bit set, override the existing one
          if (mbit1 !== null) {
            newReplyObject.breakBit = mbit1;
          }

          // Clear the conversation thread (this is on the next cycle)
          newReplyObject.clearConvo = clearConvoBit;
        } else {
          // TODO: we flush everything except stars..

          debug.verbose('getReplyObject', getReplyObject);
          newReplyObject = replyObj;
          newReplyObject.reply = getReplyObject.reply;
          newReplyObject.topic = getReplyObject.topicName;
          // update the root id with the reply id (it may have changed in respond)
          newReplyObject.id = getReplyObject.reply.id;

          // This is a new bit to stop us from matching more.
          if (mbit !== null) {
            newReplyObject.breakBit = mbit;
          }
          // If the function has the bit set, override the existing one
          if (mbit1 !== null) {
            newReplyObject.breakBit = mbit1;
          }

          if (getReplyObject.clearConvo === true) {
            newReplyObject.clearConvo = getReplyObject.clearConvo;
          } else {
            newReplyObject.clearConvo = clearConvoBit;
          }

          if (getReplyObject.subReplies) {
            if (newReplyObject.subReplies && _.isArray(newReplyObject.subReplies)) {
              newReplyObject.subReplies.concat(getReplyObject.subReplies);
            } else {
              newReplyObject.subReplies = getReplyObject.subReplies;
            }
          }

          // We also want to transfer forward any message props too
          if (getReplyObject.props) {
            newReplyObject.props = getReplyObject.props;
          }

          newReplyObject.minMatchSet = getReplyObject.minMatchSet;
        }

        debug.verbose('Return back to replies to re-process for more tags', newReplyObject);
        // Okay Lets call this function again
        return processReplyTags(newReplyObject, options, callback);
      }
    };

    // TODO: Fix this replyOptions object
    // This is the options for the (get)reply function, used for recursive traversal.
    const replyOptions = {
      topic: replyObj.topic,
      depth: options.depth + 1,
      message,
      system,
      user: options.user,
    };

    if (redirectMatch && match === 'redirectMatch') {
      return inlineRedirect(replyString, redirectMatch, replyOptions, augmentCallbackHandle);
    }

    if (topicRedirectMatch && match === 'topicRedirectMatch') {
      return topicRedirect(replyString, stars, topicRedirectMatch, replyOptions, augmentCallbackHandle);
    }

    if (respondMatch && match === 'respondMatch') {
      // In some edge cases you could name a topic with a ~ and wordnet will remove it.
      // respond needs a topic so we re-try again with the origional reply.
      if (respondMatch[1] === '') {
        replyString = originalReply;
        respondMatch = regexes.respond.match(replyString);
      }

      return respond(replyString, respondMatch, replyOptions, augmentCallbackHandle);
    }

    if (customFunctionMatch && match === 'customFunctionMatch') {
      return customFunction(replyString, customFunctionMatch, replyOptions, augmentCallbackHandle);
    }

    // Using global callback and user.
    const afterHandle = function afterHandle(callback) {
      return (err, finalReply) => {
        if (err) {
          console.log(err);
        }

        // This will update the reply with wordnet replaced changes and alternates
        finalReply = processHelpers.processAlternates(finalReply);

        const msgStateMatch = regexes.state.match(finalReply);
        if (msgStateMatch && finalReply.indexOf('delay') === -1) {
          for (let i = 0; i < msgStateMatch.length; i++) {
            const stateObj = processHelpers.addStateData(msgStateMatch[i]);
            debug.verbose('Found Conversation State', stateObj);
            options.user.conversationState = _.merge(options.user.conversationState, stateObj);
            options.user.markModified('conversationState');
            finalReply = finalReply.replace(msgStateMatch[i], '');
          }
          finalReply = finalReply.trim();
        }

        replyObj.reply.reply = Utils.decodeCommas(new RE2('\\\\s', 'g').replace(finalReply, ' '));

        if (clearConvoBit && clearConvoBit === true) {
          replyObj.clearConvo = clearConvoBit;
        }

        // This is a new bit to stop us from matching more.
        if (!replyObj.breakBit && mbit !== null) {
          replyObj.breakBit = mbit;
        }

        debug.verbose('Calling back with', replyObj);

        if (!replyObj.props && message.props) {
          replyObj.props = message.props;
        } else {
          replyObj.props = _.merge(replyObj.props, message.props);
        }

        callback(err, replyObj);
      };
    };

    replace(replyString, WORDNET_REGEX, processHelpers.wordnetReplace, afterHandle(callback));
  });
};

const processThreadTags = function processThreadTags(string) {
  const threads = [];
  const strings = [];
  string.split('\n').forEach((line) => {
    const match = regexes.delay.match(line);
    if (match) {
      threads.push({ delay: match[1], string: Utils.trim(line.replace(match[0], '')) });
    } else {
      strings.push(line);
    }
  });
  return [strings.join('\n'), threads];
};

export default { processThreadTags, processReplyTags };
