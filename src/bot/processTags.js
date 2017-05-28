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

  if (options.user.history[conversationID].stars && options.user.history[conversationID].stars[starID]) {
    replacedCapture = options.user.history[conversationID].stars[starID];
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
  if (options.user.history.length === 0) {
    // Nothing yet in the history
    replacedInput = '';
  } else {
    replacedInput = options.user.history[inputID].input.original;
  }
  debug.verbose(`Replacing <input${inputID + 1}> with "${replacedInput}"`);
  return replacedInput;
};

const processPreviousReply = function processPreviousReply(tag, replyObj, options) {
  const replyID = (tag.replyID || 1) - 1;
  debug.verbose(`Processing previous reply <reply${replyID + 1}>`);
  let replacedReply = '';
  if (options.user.history === 0) {
    // Nothing yet in the history
    replacedReply = '';
  } else {
    replacedReply = options.user.history[replyID].reply;
  }
  debug.verbose(`Replacing <reply{replyID + 1}> with "${replacedReply}"`);
  return replacedReply;
};

const processWordnetLookup = async function processWordnetLookup(tag, replyObj, options) {
  debug.verbose(`Processing wordnet lookup for word: ~${tag.term}`);
  let words = await wordnet.lookup(tag.term, '~');
  words = words.map(item => item.replace(/_/g, ' '));
  debug.verbose(`Terms found in wordnet: ${words}`);

  const replacedWordnet = Utils.pickItem(words);
  debug.verbose(`Wordnet replaced term: ${replacedWordnet}`);
  return replacedWordnet;
};

// Replacements are captures or wordnet lookups
const processReplacement = async function processReplacement(tag, replyObj, options) {
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
    case 'wordnetLookup': {
      return processWordnetLookup(tag, replyObj, options);
    }
    default: {
      throw new Error(`Replacement tag type does not exist: ${tag.type}`);
    }
  }
};

const preprocess = async function preprocess(reply, replyObj, options) {
  let captureTags = preprocessParser.parse(reply);
  captureTags = _.flattenDeep(captureTags);
  const cleanTags = await Promise.all(captureTags.map(async (tag) => {
    // Don't do anything to non-captures/wordnet terms
    if (typeof tag === 'string') {
      return tag;
    }
    // It's a capture or wordnet lookup e.g. <cap2> or ~like, so replace it with
    // the captured star in replyObj.stars or a random selection of wordnet term
    const replacement = await processReplacement(tag, replyObj, options);
    return `"${replacement}"`;
  }));
  return cleanTags.join('');
};

const postAugment = function postAugment(replyObject, augmentedReplyObject) {
  replyObject.continueMatching = augmentedReplyObject.continueMatching;
  replyObject.clearConversation = replyObject.clearConversation || augmentedReplyObject.clearConversation;
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
  return augmentedReplyObject.string;
};

const processTopicRedirect = async function processTopicRedirect(tag, replyObj, options) {
  let cleanedArgs = null;
  try {
    cleanedArgs = safeEval(tag.functionArgs);
  } catch (err) {
    throw new Error(`Error processing topicRedirect args: ${err}`);
  }

  const topicName = cleanedArgs[0];
  const topicTrigger = cleanedArgs[1];

  debug.verbose(`Processing topic redirect ^topicRedirect(${topicName},${topicTrigger})`);
  options.depth += 1;
  const augmentedReplyObject = await topicRedirect(topicName, topicTrigger, options);
  return postAugment(replyObj, augmentedReplyObject);
};

const processRespond = async function processRespond(tag, replyObj, options) {
  let cleanedArgs = null;
  try {
    cleanedArgs = safeEval(tag.functionArgs);
  } catch (err) {
    throw new Error(`Error processing respond args: ${err}`);
  }

  const topicName = cleanedArgs[0];

  debug.verbose(`Processing respond: ^respond(${topicName})`);
  options.depth += 1;
  const augmentedReplyObject = await respond(topicName, options);
  return postAugment(replyObj, augmentedReplyObject);
};

const processRedirect = async function processRedirect(tag, replyObj, options) {
  debug.verbose(`Processing inline redirect: {@${tag.trigger}}`);
  options.depth += 1;
  const augmentedReplyObject = await inlineRedirect(tag.trigger, options);
  return postAugment(replyObj, augmentedReplyObject);
};

const processCustomFunction = async function processCustomFunction(tag, replyObj, options) {
  if (tag.functionArgs === null) {
    debug.verbose(`Processing custom function: ^${tag.functionName}()`);
    return customFunction(tag.functionName, [], replyObj, options);
  }

  let cleanArgs = null;
  try {
    cleanArgs = safeEval(tag.functionArgs);
  } catch (e) {
    throw new Error(`Error processing custom function arguments: ${e}`);
  }

  const response = await customFunction(tag.functionName, cleanArgs, replyObj, options);
  // The custom function might return something with more tags, so do it all again
  let preprocessed;
  try {
    preprocessed = await preprocess(response, replyObj, options);
  } catch (err) {
    throw new Error(`There was an error preprocessing reply tags: ${err}`);
  }

  const replyTags = parser.parse(preprocessed);

  try {
    const processedReplyParts = await Promise.all(replyTags.map(async tag => (
      processTag(tag, replyObj, options)
    )));
    return processedReplyParts.join('').trim();
  } catch (err) {
    throw new Error(`There was an error processing reply tags: ${err}`);
  }
};

const processNewTopic = async function processNewTopic(tag, replyObj, options) {
  debug.verbose(`Processing new topic: ${tag.topicName}`);
  const newTopic = tag.topicName;
  await options.user.setTopic(newTopic);
  return '';
};

const processClearConversation = function processClearConversation(tag, replyObj, options) {
  debug.verbose('Processing clear conversation: setting clear conversation to true');
  replyObj.clearConversation = true;
  return '';
};

const processContinueSearching = function processContinueSearching(tag, replyObj, options) {
  debug.verbose('Processing continue searching: setting continueMatching to true');
  replyObj.continueMatching = true;
  return '';
};

const processEndSearching = function processEndSearching(tag, replyObj, options) {
  debug.verbose('Processing end searching: setting continueMatching to false');
  replyObj.continueMatching = false;
  return '';
};

const processAlternates = function processAlternates(tag, replyObj, options) {
  debug.verbose(`Processing alternates: ${tag.alternates}`);
  const alternates = tag.alternates;
  const random = Utils.getRandomInt(0, alternates.length - 1);
  const result = alternates[random];
  return result;
};

const processDelay = function processDelay(tag, replyObj, options) {
  return `{delay=${tag.delayLength}}`;
};

const processSetState = function processSetState(tag, replyObj, options) {
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
  return '';
};

const processTag = async function processTag(tag, replyObj, options) {
  if (typeof tag === 'string') {
    return tag;
  }

  const tagType = tag.type;
  switch (tagType) {
    case 'capture':
    case 'previousCapture':
    case 'previousInput':
    case 'previousReply':
    case 'wordnetLookup': {
      return processReplacement(tag, replyObj, options);
    }
    case 'topicRedirect': {
      return processTopicRedirect(tag, replyObj, options);
    }
    case 'respond': {
      return processRespond(tag, replyObj, options);
    }
    case 'customFunction': {
      return processCustomFunction(tag, replyObj, options);
    }
    case 'newTopic': {
      return processNewTopic(tag, replyObj, options);
    }
    case 'clearConversation': {
      return processClearConversation(tag, replyObj, options);
    }
    case 'continueSearching': {
      return processContinueSearching(tag, replyObj, options);
    }
    case 'endSearching': {
      return processEndSearching(tag, replyObj, options);
    }
    case 'redirect': {
      return processRedirect(tag, replyObj, options);
    }
    case 'alternates': {
      return processAlternates(tag, replyObj, options);
    }
    case 'delay': {
      return processDelay(tag, replyObj, options);
    }
    case 'setState': {
      return processSetState(tag, replyObj, options);
    }
    default: {
      throw new Error(`No such tag type: ${tagType}`);
    }
  }
};


const processReplyTags = async function processReplyTags(replyObj, options) {
  debug.verbose('Depth: ', options.depth);

  let replyString = replyObj.reply.reply;
  debug.info(`Reply before processing reply tags: "${replyString}"`);

  options.topic = replyObj.topic;
  replyObj.replyIds = [replyObj.reply._id];

  // Deals with captures and wordnet lookups within functions as a preprocessing step
  // e.g. ^myFunction(<cap1>, ~hey, "otherThing")
  let preprocessed;
  try {
    preprocessed = await preprocess(replyString, replyObj, options);
  } catch (err) {
    console.error(`There was an error preprocessing reply tags: ${err}`);
    return null;
  }

  const replyTags = parser.parse(preprocessed);

  let processedReplyParts;
  try {
    processedReplyParts = await Promise.all(replyTags.map(async tag => (
      processTag(tag, replyObj, options)
    )));
  } catch (err) {
    console.error(`There was an error processing reply tags: ${err}`);
    if (replyTags[0].type === 'customFunction'){
      console.error(`There is a syntax error in ${replyTags[0].functionName}`);
    }
    return null;
  }

  replyString = processedReplyParts.join('').trim();

  const spaceRegex = /\\s/g;
  replyObj.reply.reply = replyString.replace(spaceRegex, ' ');

  debug.verbose('Final reply object from processTags: ', replyObj);

  if (_.isEmpty(options.user.pendingTopic)) {
    await options.user.setTopic(replyObj.topic);
  }

  return replyObj;
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
