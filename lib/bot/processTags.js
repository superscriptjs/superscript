'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _re = require('re2');

var _re2 = _interopRequireDefault(_re);

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

var _pegjs = require('pegjs');

var _pegjs2 = _interopRequireDefault(_pegjs);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var _common = require('./reply/common');

var _common2 = _interopRequireDefault(_common);

var _regexes = require('./regexes');

var _regexes2 = _interopRequireDefault(_regexes);

var _wordnet = require('./reply/wordnet');

var _wordnet2 = _interopRequireDefault(_wordnet);

var _inlineRedirect = require('./reply/inlineRedirect');

var _inlineRedirect2 = _interopRequireDefault(_inlineRedirect);

var _topicRedirect = require('./reply/topicRedirect');

var _topicRedirect2 = _interopRequireDefault(_topicRedirect);

var _respond = require('./reply/respond');

var _respond2 = _interopRequireDefault(_respond);

var _customFunction = require('./reply/customFunction');

var _customFunction2 = _interopRequireDefault(_customFunction);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

var debug = (0, _debugLevels2.default)('SS:ProcessTags');

var grammar = _fs2.default.readFileSync(__dirname + '/reply/reply-grammar.pegjs', 'utf-8');
// Change trace to true to debug peg
var parser = _pegjs2.default.generate(grammar, { trace: false });

var captureGrammar = _fs2.default.readFileSync(__dirname + '/reply/capture-grammar.pegjs', 'utf-8');
// Change trace to true to debug peg
var captureParser = _pegjs2.default.generate(captureGrammar, { trace: false });

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

var processCapture = function processCapture(tag, replyObj, options) {
  var starID = (tag.starID || 1) - 1;
  debug.verbose('Processing capture: <cap' + (starID + 1) + '>');
  var replacedCapture = starID < replyObj.stars.length ? replyObj.stars[starID] : '';
  debug.verbose('Replacing <cap' + (starID + 1) + '> with "' + replacedCapture + '"');
  return replacedCapture;
};

var processPreviousCapture = function processPreviousCapture(tag, replyObj, options) {
  // This is to address GH-207, pulling the stars out of the history and
  // feeding them forward into new replies. It allows us to save a tiny bit of
  // context though a conversation cycle.
  // TODO: handle captures within captures, but only 1 level deep
  var starID = (tag.starID || 1) - 1;
  var conversationID = (tag.conversationID || 1) - 1;
  debug.verbose('Processing previous capture: <p' + (conversationID + 1) + 'cap' + (starID + 1) + '>');
  var replacedCapture = '';

  if (options.user.history.stars[conversationID] && options.user.history.stars[conversationID][starID]) {
    replacedCapture = options.user.history.stars[conversationID][starID];
    debug.verbose('Replacing <p' + (conversationID + 1) + 'cap' + (starID + 1) + '> with "' + replacedCapture + '"');
  } else {
    debug.verbose('Attempted to use previous capture data, but none was found in user history.');
  }
  return replacedCapture;
};

var processPreviousInput = function processPreviousInput(tag, replyObj, options) {
  if (tag.inputID === null) {
    debug.verbose('Processing previous input <input>');
    // This means <input> instead of <input1>, <input2> etc. so give the current input back
    var _replacedInput = options.message.clean;
    return _replacedInput;
  }

  var inputID = (tag.inputID || 1) - 1;
  debug.verbose('Processing previous input <input' + (inputID + 1) + '>');
  var replacedInput = '';
  if (!options.user.history.input) {
    // Nothing yet in the history
    replacedInput = '';
  } else {
    replacedInput = options.user.history.input[inputID].clean;
  }
  debug.verbose('Replacing <input' + (inputID + 1) + '> with "' + replacedInput + '"');
  return replacedInput;
};

var processPreviousReply = function processPreviousReply(tag, replyObj, options) {
  var replyID = (tag.replyID || 1) - 1;
  debug.verbose('Processing previous reply <reply' + (replyID + 1) + '>');
  var replacedReply = '';
  if (!options.user.history.reply) {
    // Nothing yet in the history
    replacedReply = '';
  } else {
    replacedReply = options.user.history.reply[replyID];
  }
  debug.verbose('Replacing <reply{replyID + 1}> with "' + replacedReply + '"');
  return replacedReply;
};

var processCaptures = function processCaptures(tag, replyObj, options) {
  switch (tag.type) {
    case 'capture':
      {
        return processCapture(tag, replyObj, options);
      }
    case 'previousCapture':
      {
        return processPreviousCapture(tag, replyObj, options);
      }
    case 'previousInput':
      {
        return processPreviousInput(tag, replyObj, options);
      }
    case 'previousReply':
      {
        return processPreviousReply(tag, replyObj, options);
      }
    default:
      {
        console.error('Capture tag type does not exist: ' + tag.type);
        return '';
      }
  }
};

var preprocess = function preprocess(reply, replyObj, options) {
  var captureTags = captureParser.parse(reply);
  var cleanedReply = captureTags.map(function (tag) {
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

var postAugment = function postAugment(replyObject, tag, callback) {
  return function (err, augmentedReplyObject) {
    if (err) {
      // If we get an error, we back out completely and reject the reply.
      debug.verbose('We got an error back from one of the handlers', err);
      return callback(err, '');
    }

    replyObject.continueMatching = augmentedReplyObject.continueMatching;
    replyObject.clearConversation = augmentedReplyObject.clearConversation;
    replyObject.topic = augmentedReplyObject.topicName;
    replyObject.props = _lodash2.default.merge(replyObject.props, augmentedReplyObject.props);

    // Keep track of all the ids of all the triggers we go through via redirects
    if (augmentedReplyObject.replyIds) {
      augmentedReplyObject.replyIds.forEach(function (replyId) {
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

    replyObject.minMatchSet = augmentedReplyObject.minMatchSet;
    return callback(null, augmentedReplyObject.string);
  };
};

var processTopicRedirect = function processTopicRedirect(tag, replyObj, options, callback) {
  debug.verbose('Processing topic redirect ^topicRedirect(' + tag.topicName + ',' + tag.topicTrigger + ')');
  options.depth = options.depth + 1;
  (0, _topicRedirect2.default)(tag.topicName, tag.topicTrigger, options, postAugment(replyObj, tag, callback));
};

var processRespond = function processRespond(tag, replyObj, options, callback) {
  debug.verbose('Processing respond: ^respond(' + tag.topicName + ')');
  options.depth = options.depth + 1;
  (0, _respond2.default)(tag.topicName, options, postAugment(replyObj, tag, callback));
};

var processRedirect = function processRedirect(tag, replyObj, options, callback) {
  debug.verbose('Processing inline redirect: {@' + tag.trigger + '}');
  options.depth = options.depth + 1;
  (0, _inlineRedirect2.default)(tag.trigger, options, postAugment(replyObj, tag, callback));
};

var processCustomFunction = function processCustomFunction(tag, replyObj, options, callback) {
  if (tag.args === null) {
    debug.verbose('Processing custom function: ^' + tag.functionName + '()');
    return (0, _customFunction2.default)(tag.functionName, [], replyObj, options, callback);
  }

  // If there's a wordnet lookup as a parameter, expand it first
  return _async2.default.map(tag.functionArgs, function (arg, next) {
    if (typeof arg === 'string') {
      return next(null, arg);
    }
    return processWordnetLookup(arg, replyObj, options, next);
  }, function (err, args) {
    if (err) {
      console.error(err);
    }
    debug.verbose('Processing custom function: ^' + tag.functionName + '(' + args.join(', ') + ')');
    return (0, _customFunction2.default)(tag.functionName, args, replyObj, options, callback);
  });
};

var processNewTopic = function processNewTopic(tag, replyObj, options, callback) {
  debug.verbose('Processing new topic: ' + tag.topicName);
  var newTopic = tag.topicName;
  options.user.setTopic(newTopic, function () {
    return callback(null, '');
  });
};

var processClearConversation = function processClearConversation(tag, replyObj, options, callback) {
  debug.verbose('Processing clear conversation: setting clear conversation to true');
  replyObj.clearConversation = true;
  callback(null, '');
};

var processContinueSearching = function processContinueSearching(tag, replyObj, options, callback) {
  debug.verbose('Processing continue searching: setting continueMatching to true');
  replyObj.continueMatching = true;
  callback(null, '');
};

var processEndSearching = function processEndSearching(tag, replyObj, options, callback) {
  debug.verbose('Processing end searching: setting continueMatching to false');
  replyObj.continueMatching = false;
  callback(null, '');
};

var processWordnetLookup = function processWordnetLookup(tag, replyObj, options, callback) {
  debug.verbose('Processing wordnet lookup for word: ~' + tag.term);
  _wordnet2.default.lookup(tag.term, '~', function (err, words) {
    if (err) {
      console.error(err);
    }

    words = words.map(function (item) {
      return item.replace(/_/g, ' ');
    });
    debug.verbose('Terms found in wordnet: ' + words);

    var replacedWordnet = _utils2.default.pickItem(words);
    debug.verbose('Wordnet replaced term: ' + replacedWordnet);
    callback(null, replacedWordnet);
  });
};

var processAlternates = function processAlternates(tag, replyObj, options, callback) {
  debug.verbose('Processing alternates: ' + tag.alternates);
  var alternates = tag.alternates;
  var random = _utils2.default.getRandomInt(0, alternates.length - 1);
  var result = alternates[random];
  callback(null, result);
};

var processDelay = function processDelay(tag, replyObj, options, callback) {
  callback(null, '{delay=' + tag.delayLength + '}');
};

var processSetState = function processSetState(tag, replyObj, options, callback) {
  debug.verbose('Processing setState: ' + JSON.stringify(tag.stateToSet));
  var stateToSet = tag.stateToSet;
  var newState = {};
  stateToSet.forEach(function (keyValuePair) {
    var key = keyValuePair.key;
    var value = keyValuePair.value;

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
  debug.verbose('New state: ' + JSON.stringify(newState));
  options.user.conversationState = _lodash2.default.merge(options.user.conversationState, newState);
  options.user.markModified('conversationState');
  callback(null, '');
};

var processTag = function processTag(tag, replyObj, options, next) {
  if (typeof tag === 'string') {
    next(null, tag);
  } else {
    var tagType = tag.type;
    switch (tagType) {
      case 'topicRedirect':
        {
          processTopicRedirect(tag, replyObj, options, next);
          break;
        }
      case 'respond':
        {
          processRespond(tag, replyObj, options, next);
          break;
        }
      case 'customFunction':
        {
          processCustomFunction(tag, replyObj, options, next);
          break;
        }
      case 'newTopic':
        {
          processNewTopic(tag, replyObj, options, next);
          break;
        }
      case 'clearConversation':
        {
          processClearConversation(tag, replyObj, options, next);
          break;
        }
      case 'continueSearching':
        {
          processContinueSearching(tag, replyObj, options, next);
          break;
        }
      case 'endSearching':
        {
          processEndSearching(tag, replyObj, options, next);
          break;
        }
      case 'wordnetLookup':
        {
          processWordnetLookup(tag, replyObj, options, next);
          break;
        }
      case 'redirect':
        {
          processRedirect(tag, replyObj, options, next);
          break;
        }
      case 'alternates':
        {
          processAlternates(tag, replyObj, options, next);
          break;
        }
      case 'delay':
        {
          processDelay(tag, replyObj, options, next);
          break;
        }
      case 'setState':
        {
          processSetState(tag, replyObj, options, next);
          break;
        }
      default:
        {
          next('No such tag type: ' + tagType);
          break;
        }
    }
  }
};

var processReplyTags = function processReplyTags(replyObj, options, callback) {
  debug.verbose('Depth: ', options.depth);

  var replyString = replyObj.reply.reply;
  debug.info('Reply before processing reply tags: "' + replyString + '"');

  options.topic = replyObj.topic;

  // Deals with captures as a preprocessing step (avoids tricksy logic having captures
  // as function parameters)
  var preprocessed = preprocess(replyString, replyObj, options);
  var replyTags = parser.parse(preprocessed);

  replyObj.replyIds = [replyObj.reply._id];

  _async2.default.mapSeries(replyTags, function (tag, next) {
    if (typeof tag === 'string') {
      next(null, tag);
    } else {
      processTag(tag, replyObj, options, next);
    }
  }, function (err, processedReplyParts) {
    if (err) {
      console.error('There was an error processing reply tags: ' + err);
    }

    replyString = processedReplyParts.join('').trim();

    replyObj.reply.reply = new _re2.default('\\\\s', 'g').replace(replyString, ' ');

    debug.verbose('Final reply object from processTags: ', replyObj);

    if (_lodash2.default.isEmpty(options.user.pendingTopic)) {
      return options.user.setTopic(replyObj.topic, function () {
        return callback(err, replyObj);
      });
    }

    return callback(err, replyObj);
  });
};

var processThreadTags = function processThreadTags(string) {
  var threads = [];
  var strings = [];
  string.split('\n').forEach(function (line) {
    var match = _regexes2.default.delay.match(line);
    if (match) {
      threads.push({ delay: match[1], string: _utils2.default.trim(line.replace(match[0], '')) });
    } else {
      strings.push(line);
    }
  });
  return [strings.join('\n'), threads];
};

exports.default = { processThreadTags: processThreadTags, processReplyTags: processReplyTags };