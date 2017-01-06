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
import debuglog from 'debug-levels';
import peg from 'pegjs';
import fs from 'fs';
import safeEval from 'safe-eval';

import Utils from './utils';
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

const preprocessGrammar = fs.readFileSync(`${__dirname}/reply/preprocess-grammar.pegjs`, 'utf-8');
// Change trace to true to debug peg
const preprocessParser = peg.generate(preprocessGrammar, { trace: false });

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

const processCapture = function processCapture(tag, replyObj, options, callback) {
  const starID = (tag.starID || 1) - 1;
  debug.verbose(`Processing capture: <cap${starID + 1}>`);
  const replacedCapture = (starID < replyObj.stars.length) ? replyObj.stars[starID] : '';
  debug.verbose(`Replacing <cap${starID + 1}> with "${replacedCapture}"`);
  callback(null, replacedCapture);
};

const processPreviousCapture = function processPreviousCapture(tag, replyObj, options, callback) {
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
  callback(null, replacedCapture);
};

const processPreviousInput = function processPreviousInput(tag, replyObj, options, callback) {
  if (tag.inputID === null) {
    debug.verbose('Processing previous input <input>');
    // This means <input> instead of <input1>, <input2> etc. so give the current input back
    const replacedInput = options.message.clean;
    return callback(null, replacedInput);
  }

  const inputID = (tag.inputID || 1) - 1;
  debug.verbose(`Processing previous input <input${inputID + 1}>`);
  let replacedInput = '';
  if (!options.user.history.input) {
    // Nothing yet in the history
    replacedInput = '';
  } else {
    replacedInput = options.user.history.input[inputID].original;
  }
  debug.verbose(`Replacing <input${inputID + 1}> with "${replacedInput}"`);
  return callback(null, replacedInput);
};

const processPreviousReply = function processPreviousReply(tag, replyObj, options, callback) {
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
  return callback(null, replacedReply);
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

// Replacements are captures or wordnet lookups
const processReplacement = function processReplacement(tag, replyObj, options, callback) {
  switch (tag.type) {
    case 'capture': {
      return processCapture(tag, replyObj, options, callback);
    }
    case 'previousCapture': {
      return processPreviousCapture(tag, replyObj, options, callback);
    }
    case 'previousInput': {
      return processPreviousInput(tag, replyObj, options, callback);
    }
    case 'previousReply': {
      return processPreviousReply(tag, replyObj, options, callback);
    }
    case 'wordnetLookup': {
      return processWordnetLookup(tag, replyObj, options, callback);
    }
    default: {
      return callback(`Replacement tag type does not exist: ${tag.type}`);
    }
  }
};

const preprocess = function preprocess(reply, replyObj, options, callback) {
  let captureTags = preprocessParser.parse(reply);
  captureTags = _.flattenDeep(captureTags);
  async.map(captureTags, (tag, next) => {
    // Don't do anything to non-captures/wordnet terms
    if (typeof tag === 'string') {
      return next(null, tag);
    }
    // It's a capture or wordnet lookup e.g. <cap2> or ~like, so replace it with
    // the captured star in replyObj.stars or a random selection of wordnet term
    return processReplacement(tag, replyObj, options, (err, replacement) => {
      const escapedReplacement = `"${replacement}"`;
      next(err, escapedReplacement);
    });
  }, (err, cleanTags) => {
    callback(err, cleanTags.join(''));
  });
};

const postAugment = function postAugment(replyObject, tag, callback) {
  return (err, augmentedReplyObject) => {
    if (err) {
      // If we get an error, we back out completely and reject the reply.
      debug.verbose('We got an error back from one of the handlers', err);
      return callback(err, '');
    }

    replyObject.continueMatching = augmentedReplyObject.continueMatching;
    replyObject.clearConversation = augmentedReplyObject.clearConversation;
    replyObject.topic = augmentedReplyObject.topicName;
    replyObject.props = _.merge(replyObject.props, augmentedReplyObject.props);

    // Keep track of all the ids of all the triggers we go through via redirects
    if (augmentedReplyObject.replyIds) {
      augmentedReplyObject.replyIds.forEach((replyId) => {
        replyObject.replyIds.push(replyId);
      });
    }

    if (augmentedReplyObject.subReplies) {
      if (replyObject.subReplies) {
        replyObject.subReplies = replyObject.subReplies.concat(augmentedReplyObject.subReplies);
      } else {
        replyObject.subReplies = augmentedReplyObject.subReplies;
      }
    }

    replyObject.debug = augmentedReplyObject.debug;
    return callback(null, augmentedReplyObject.string);
  };
};

const processTopicRedirect = function processTopicRedirect(tag, replyObj, options, callback) {
  let cleanedArgs = null;
  try {
    cleanedArgs = safeEval(tag.functionArgs);
  } catch (err) {
    return callback(`Error processing topicRedirect args: ${err}`);
  }

  const topicName = cleanedArgs[0];
  const topicTrigger = cleanedArgs[1];

  debug.verbose(`Processing topic redirect ^topicRedirect(${topicName},${topicTrigger})`);
  options.depth += 1;
  return topicRedirect(topicName, topicTrigger, options, postAugment(replyObj, tag, callback));
};

const processRespond = function processRespond(tag, replyObj, options, callback) {
  let cleanedArgs = null;
  try {
    cleanedArgs = safeEval(tag.functionArgs);
  } catch (err) {
    return callback(`Error processing respond args: ${err}`);
  }

  const topicName = cleanedArgs[0];

  debug.verbose(`Processing respond: ^respond(${topicName})`);
  options.depth += 1;
  return respond(topicName, options, postAugment(replyObj, tag, callback));
};

const processRedirect = function processRedirect(tag, replyObj, options, callback) {
  debug.verbose(`Processing inline redirect: {@${tag.trigger}}`);
  options.depth += 1;
  inlineRedirect(tag.trigger, options, postAugment(replyObj, tag, callback));
};

const processCustomFunction = function processCustomFunction(tag, replyObj, options, callback) {
  if (tag.functionArgs === null) {
    debug.verbose(`Processing custom function: ^${tag.functionName}()`);
    return customFunction(tag.functionName, [], replyObj, options, callback);
  }

  let cleanArgs = null;
  try {
    cleanArgs = safeEval(tag.functionArgs);
  } catch (e) {
    return callback(`Error processing custom function arguments: ${e}`);
  }

  return customFunction(tag.functionName, cleanArgs, replyObj, options, (err, response) => {
    // The custom function might return something with more tags, so do it all again
    preprocess(response, replyObj, options, (err, preprocessed) => {
      if (err) {
        return callback(`There was an error preprocessing reply tags: ${err}`);
      }

      const replyTags = parser.parse(preprocessed);

      return async.mapSeries(replyTags, (tag, next) => {
        if (typeof tag === 'string') {
          next(null, tag);
        } else {
          processTag(tag, replyObj, options, next);
        }
      }, (err, processedReplyParts) => {
        if (err) {
          console.error(`There was an error processing reply tags: ${err}`);
        }

        callback(err, processedReplyParts.join('').trim());
      });
    });
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
      case 'capture':
      case 'previousCapture':
      case 'previousInput':
      case 'previousReply':
      case 'wordnetLookup': {
        processReplacement(tag, replyObj, options, next);
        break;
      }
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
  replyObj.replyIds = [replyObj.reply._id];

  // Deals with captures and wordnet lookups within functions as a preprocessing step
  // e.g. ^myFunction(<cap1>, ~hey, "otherThing")
  preprocess(replyString, replyObj, options, (err, preprocessed) => {
    if (err) {
      console.error(`There was an error preprocessing reply tags: ${err}`);
    }

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

      const spaceRegex = /\\s/g;
      replyObj.reply.reply = replyString.replace(spaceRegex, ' ');

      debug.verbose('Final reply object from processTags: ', replyObj);

      if (_.isEmpty(options.user.pendingTopic)) {
        return options.user.setTopic(replyObj.topic, () => callback(err, replyObj));
      }

      return callback(err, replyObj);
    });
  });
};

const processThreadTags = function processThreadTags(string) {
  const threads = [];
  const strings = [];
  string.split('\n').forEach((line) => {
    const match = line.match(regexes.delay);
    if (match) {
      threads.push({ delay: match[1], string: line.replace(match[0], '').trim() });
    } else {
      strings.push(line);
    }
  });
  return [strings.join('\n'), threads];
};

export default {
  preprocess,
  processThreadTags,
  processReplyTags,
};
