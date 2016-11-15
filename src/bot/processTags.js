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
import async from 'async';
import RE2 from 're2';
import debuglog from 'debug-levels';
import peg from 'pegjs';
import fs from 'fs';

import Utils from './utils';
import processHelpers from './reply/common';
import regexes from './regexes';
import wordnet from './reply/wordnet';

import inlineRedirect from './reply/inlineRedirect';
import topicRedirect from './reply/topicRedirect';
import respond from './reply/respond';
import customFunction from './reply/customFunction';

const debug = debuglog('SS:ProcessTags');

const grammar = fs.readFileSync(`${__dirname}/reply/reply-grammar.pegjs`, 'utf-8');
// Change trace to true to debug peg
const parser = peg.generate(grammar, { trace: false });

const captureGrammar = fs.readFileSync(`${__dirname}/reply/capture-grammar.pegjs`, 'utf-8');
// Change trace to true to debug peg
const captureParser = peg.generate(captureGrammar, { trace: false });

/* topicRedirect
/ respond
/ redirect
/ customFunction
/ newTopic
/ capture
/ previousCapture
/ clearConversation
/ continueSearching
/ endSearching
/ previousInput
/ previousReply
/ wordnetLookup
/ alternates
/ delay
/ setState
/ string*/

const processCapture = function processCapture(tag, replyObj, options) {
  const starID = (tag.starID || 1) - 1;
  debug.verbose(`Processing capture: <cap${starID + 1}>`);
  const replacedCapture = (starID < replyObj.stars.length) ? replyObj.stars[starID] : '';
  debug.verbose(`Replacing <cap${starID + 1}> with "${replacedCapture}"`);
  return replacedCapture;
};

const processPreviousCapture = function processPreviousCapture(tag, replyObj, options) {
  // This is to address GH-207, pulling the stars out of the history and
  // feeding them forward into new replies. It allows us to save a tiny bit of
  // context though a conversation cycle.
  // TODO: handle captures within captures, but only 1 level deep
  const starID = (tag.starID || 1) - 1;
  const conversationID = (tag.conversationID || 1) - 1;
  debug.verbose(`Processing previous capture: <p${conversationID + 1}cap${starID + 1}>`);
  let replacedCapture = '';

  if (options.user.history.stars[conversationID] && options.user.history.stars[conversationID][starID]) {
    replacedCapture = options.user.history.stars[conversationID][starID];
    debug.verbose(`Replacing <p${conversationID + 1}cap${starID + 1}> with "${replacedCapture}"`);
  } else {
    debug.verbose('Attempted to use previous capture data, but none was found in user history.');
  }
  return replacedCapture;
};

const processPreviousInput = function processPreviousInput(tag, replyObj, options) {
  if (tag.inputID === null) {
    debug.verbose('Processing previous input <input>');
    // This means <input> instead of <input1>, <input2> etc. so give the current input back
    const replacedInput = options.message.clean;
    return replacedInput;
  }

  const inputID = (tag.inputID || 1) - 1;
  debug.verbose(`Processing previous input <input${inputID + 1}>`);
  let replacedInput = '';
  if (!options.user.history.input) {
    // Nothing yet in the history
    replacedInput = '';
  } else {
    replacedInput = options.user.history.input[inputID].clean;
  }
  debug.verbose(`Replacing <input${inputID + 1}> with "${replacedInput}"`);
  return replacedInput;
};

const processPreviousReply = function processPreviousReply(tag, replyObj, options) {
  const replyID = (tag.replyID || 1) - 1;
  debug.verbose(`Processing previous reply <reply${replyID + 1}>`);
  let replacedReply = '';
  if (!options.user.history.reply) {
    // Nothing yet in the history
    replacedReply = '';
  } else {
    replacedReply = options.user.history.reply[replyID];
  }
  debug.verbose(`Replacing <reply{replyID + 1}> with "${replacedReply}"`);
  return replacedReply;
};

const processCaptures = function processCaptures(tag, replyObj, options) {
  switch (tag.type) {
    case 'capture': {
      return processCapture(tag, replyObj, options);
    }
    case 'previousCapture': {
      return processPreviousCapture(tag, replyObj, options);
    }
    case 'previousInput': {
      return processPreviousInput(tag, replyObj, options);
    }
    case 'previousReply': {
      return processPreviousReply(tag, replyObj, options);
    }
    default: {
      console.error(`Capture tag type does not exist: ${tag.type}`);
      return '';
    }
  }
};

const preprocess = function preprocess(reply, replyObj, options) {
  const captureTags = captureParser.parse(reply);
  let cleanedReply = captureTags.map((tag) => {
    // Don't do anything to non-captures
    if (typeof tag === 'string') {
      return tag;
    }
    // It's a capture e.g. <cap2>, so replace it with the captured star in replyObj.stars
    return processCaptures(tag, replyObj, options);
  });
  cleanedReply = cleanedReply.join('');
  return cleanedReply;
};

const postAugment = function postAugment(replyObject, callback) {
  return (err, augmentedReplyObject) => {
    if (err) {
      // If we get an error, we back out completely and reject the reply.
      debug.verbose('We got an error back from one of the handlers', err);
      return callback(err, '');
    }

    // console.log(replyObject);

    replyObject.continueMatching = augmentedReplyObject.continueMatching;
    replyObject.clearConversation = augmentedReplyObject.clearConversation;
    replyObject.topic = augmentedReplyObject.topicName;
    replyObject.props = _.merge(replyObject.props, augmentedReplyObject.props);
    // update the root id with the reply id (it may have changed in respond)
    replyObject.reply._id = augmentedReplyObject.replyId;

    // We also want to transfer forward any message props too
    // options.reply = replyObject.reply;

    if (augmentedReplyObject.subReplies) {
      if (replyObject.subReplies) {
        replyObject.subReplies = replyObject.subReplies.concat(augmentedReplyObject.subReplies);
      } else {
        replyObject.subReplies = augmentedReplyObject.subReplies;
      }
    }

    replyObject.minMatchSet = augmentedReplyObject.minMatchSet;
    // console.log(replyString);
    return callback(null, augmentedReplyObject.string);
  };
};

const processTopicRedirect = function processTopicRedirect(tag, replyObj, options, callback) {
  debug.verbose(`Processing topic redirect ^topicRedirect(${tag.topicName},${tag.topicTrigger})`);
  options.depth = options.depth + 1;
  topicRedirect(tag.topicName, tag.topicTrigger, options, postAugment(replyObj, callback));
};

const processRespond = function processRespond(tag, replyObj, options, callback) {
  debug.verbose(`Processing respond: ^respond(${tag.topicName})`);
  options.depth = options.depth + 1;
  respond(tag.topicName, options, postAugment(replyObj, callback));
};

const processRedirect = function processRedirect(tag, replyObj, options, callback) {
  debug.verbose(`Processing inline redirect: {@${tag.trigger}}`);
  options.depth = options.depth + 1;
  inlineRedirect(tag.trigger, options, postAugment(replyObj, callback));
};

const processCustomFunction = function processCustomFunction(tag, replyObj, options, callback) {
  if (tag.args === null) {
    debug.verbose(`Processing custom function: ^${tag.functionName}()`);
    return customFunction(tag.functionName, [], replyObj, options, callback);
  }

  // If there's a wordnet lookup as a parameter, expand it first
  return async.map(tag.functionArgs, (arg, next) => {
    if (typeof arg === 'string') {
      return next(null, arg);
    }
    return processWordnetLookup(arg, replyObj, options, next);
  }, (err, args) => {
    if (err) {
      console.error(err);
    }
    debug.verbose(`Processing custom function: ^${tag.functionName}(${args.join(', ')})`);
    return customFunction(tag.functionName, args, replyObj, options, callback);
  });
};

const processNewTopic = function processNewTopic(tag, replyObj, options, callback) {
  debug.verbose(`Processing new topic: ${tag.topicName}`);
  const newTopic = tag.topicName;
  options.user.setTopic(newTopic, () => callback(null, ''));
};

const processClearConversation = function processClearConversation(tag, replyObj, options, callback) {
  debug.verbose('Processing clear conversation: setting clear conversation to true');
  replyObj.clearConversation = true;
  callback(null, '');
};

const processContinueSearching = function processContinueSearching(tag, replyObj, options, callback) {
  debug.verbose('Processing continue searching: setting continueMatching to true');
  replyObj.continueMatching = true;
  callback(null, '');
};

const processEndSearching = function processEndSearching(tag, replyObj, options, callback) {
  debug.verbose('Processing end searching: setting continueMatching to false');
  replyObj.continueMatching = false;
  callback(null, '');
};

const processWordnetLookup = function processWordnetLookup(tag, replyObj, options, callback) {
  debug.verbose(`Processing wordnet lookup for word: ~${tag.term}`);
  wordnet.lookup(tag.term, '~', (err, words) => {
    if (err) {
      console.error(err);
    }

    words = words.map(item => item.replace(/_/g, ' '));
    debug.verbose(`Terms found in wordnet: ${words}`);

    const replacedWordnet = Utils.pickItem(words);
    debug.verbose(`Wordnet replaced term: ${replacedWordnet}`);
    callback(null, replacedWordnet);
  });
};

const processAlternates = function processAlternates(tag, replyObj, options, callback) {
  debug.verbose(`Processing alternates: ${tag.alternates}`);
  const alternates = tag.alternates;
  const random = Utils.getRandomInt(0, alternates.length - 1);
  const result = alternates[random];
  callback(null, result);
};

const processDelay = function processDelay(tag, replyObj, options, callback) {
  callback(null, `{delay=${tag.delayLength}}`);
};

const processSetState = function processSetState(tag, replyObj, options, callback) {
  debug.verbose(`Processing setState: ${JSON.stringify(tag.stateToSet)}`);
  const stateToSet = tag.stateToSet;
  const newState = {};
  stateToSet.forEach((keyValuePair) => {
    const key = keyValuePair.key;
    let value = keyValuePair.value;

    // Value is a string
    value = value.replace(/["']/g, '');

    // Value is an integer
    if (/^[\d]+$/.test(value)) {
      value = +value;
    }

    // Value is a boolean
    if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    }

    newState[key] = value;
  });
  debug.verbose(`New state: ${JSON.stringify(newState)}`);
  options.user.conversationState = _.merge(options.user.conversationState, newState);
  options.user.markModified('conversationState');
  callback(null, '');
};

const processTag = function processTag(tag, replyObj, options, next) {
  if (typeof tag === 'string') {
    next(null, tag);
  } else {
    const tagType = tag.type;
    switch (tagType) {
      case 'topicRedirect': {
        processTopicRedirect(tag, replyObj, options, next);
        break;
      }
      case 'respond': {
        processRespond(tag, replyObj, options, next);
        break;
      }
      case 'customFunction': {
        processCustomFunction(tag, replyObj, options, next);
        break;
      }
      case 'newTopic': {
        processNewTopic(tag, replyObj, options, next);
        break;
      }
      case 'clearConversation': {
        processClearConversation(tag, replyObj, options, next);
        break;
      }
      case 'continueSearching': {
        processContinueSearching(tag, replyObj, options, next);
        break;
      }
      case 'endSearching': {
        processEndSearching(tag, replyObj, options, next);
        break;
      }
      case 'wordnetLookup': {
        processWordnetLookup(tag, replyObj, options, next);
        break;
      }
      case 'redirect': {
        processRedirect(tag, replyObj, options, next);
        break;
      }
      case 'alternates': {
        processAlternates(tag, replyObj, options, next);
        break;
      }
      case 'delay': {
        processDelay(tag, replyObj, options, next);
        break;
      }
      case 'setState': {
        processSetState(tag, replyObj, options, next);
        break;
      }
      default: {
        next(`No such tag type: ${tagType}`);
        break;
      }
    }
  }
};


const processReplyTags = function processReplyTags(replyObj, options, callback) {
  debug.verbose('Depth: ', options.depth);

  let replyString = replyObj.reply.reply;
  debug.info(`Reply before processing reply tags: "${replyString}"`);

  options.topic = replyObj.topic;

  // Deals with captures as a preprocessing step (avoids tricksy logic having captures
  // as function parameters)
  const preprocessed = preprocess(replyString, replyObj, options);
  const replyTags = parser.parse(preprocessed);

  async.mapSeries(replyTags, (tag, next) => {
    if (typeof tag === 'string') {
      next(null, tag);
    } else {
      processTag(tag, replyObj, options, next);
    }
  }, (err, processedReplyParts) => {
    if (err) {
      console.error(`There was an error processing reply tags: ${err}`);
    }

    replyString = processedReplyParts.join('').trim();

    replyObj.reply.reply = new RE2('\\\\s', 'g').replace(replyString, ' ');

    debug.verbose('Final reply object from processTags: ', replyObj);

    if (_.isEmpty(options.user.pendingTopic)) {
      return options.user.setTopic(replyObj.topic, () => callback(err, replyObj));
    }

    return callback(err, replyObj);
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
