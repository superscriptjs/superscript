'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

var _utils = require('../utils');

var _utils2 = _interopRequireDefault(_utils);

var _wordnet = require('./wordnet');

var _wordnet2 = _interopRequireDefault(_wordnet);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debugLevels2.default)('SS:ProcessHelpers');

var getTopic = function getTopic(chatSystem, name, cb) {
  if (name) {
    chatSystem.Topic.findOne({ name: name }, function (err, topicData) {
      if (!topicData) {
        cb(new Error('No topic found for the topic name "' + name + '"'));
      } else {
        debug.verbose('Getting topic data for', topicData);
        cb(err, { id: topicData._id, name: name, type: 'TOPIC' });
      }
    });
  } else {
    cb(null, null);
  }
};

// TODO - Topic Setter should have its own property
/**
 * This function checks if the reply has "{topic=newTopic}" in the response,
 * and returns an array of the reply and the topic name found.
 *
 * For example, the reply:
 *
 * - Me too! {topic=animals}
 *
 * Would return ['Me too!', 'animals'].
 *
 * @param {String} reply - The reply string you want to check for a topic setter.
 */
var topicSetter = function topicSetter(replyString) {
  var TOPIC_REGEX = /\{topic=(.+?)\}/i;
  var match = replyString.match(TOPIC_REGEX);
  var depth = 0;
  var newTopic = '';

  while (match) {
    depth += 1;
    if (depth >= 50) {
      debug.verbose('Infinite loop looking for topic tag!');
      break;
    }
    newTopic = match[1];
    replyString = replyString.replace(new RegExp('{topic=' + _utils2.default.quotemeta(newTopic) + '}', 'ig'), '');
    replyString = replyString.trim();
    match = replyString.match(TOPIC_REGEX); // Look for more
  }
  debug.verbose('New topic to set: ' + newTopic + '. Cleaned reply string: ' + replyString);
  return { replyString: replyString, newTopic: newTopic };
};

var processAlternates = function processAlternates(reply) {
  // Reply Alternates.
  var match = reply.match(/\(\((.+?)\)\)/);
  var giveup = 0;
  while (match) {
    debug.verbose('Reply has Alternates');

    giveup += 1;
    if (giveup >= 50) {
      debug.verbose('Infinite loop when trying to process optionals in trigger!');
      return '';
    }

    var parts = match[1].split('|');
    var opts = [];
    for (var i = 0; i < parts.length; i++) {
      opts.push(parts[i].trim());
    }

    var resp = _utils2.default.getRandomInt(0, opts.length - 1);
    reply = reply.replace(new RegExp('\\(\\(\\s*' + _utils2.default.quotemeta(match[1]) + '\\s*\\)\\)'), opts[resp]);
    match = reply.match(/\(\((.+?)\)\)/);
  }

  return reply;
};

// Handle WordNet in Replies
var wordnetReplace = function wordnetReplace(match, sym, word, p3, offset, done) {
  _wordnet2.default.lookup(word, sym, function (err, words) {
    if (err) {
      console.log(err);
    }

    words = words.map(function (item) {
      return item.replace(/_/g, ' ');
    });

    debug.verbose('Wordnet Replies', words);
    var resp = _utils2.default.pickItem(words);
    done(null, resp);
  });
};

var addStateData = function addStateData(data) {
  var KEYVALG_REGEX = /\s*([a-z0-9]{2,20})\s*=\s*([a-z0-9\'\"]{2,20})\s*/ig;
  var KEYVALI_REGEX = /([a-z0-9]{2,20})\s*=\s*([a-z0-9\'\"]{2,20})/i;

  // Do something with the state
  var items = data.match(KEYVALG_REGEX);
  var stateData = {};

  for (var i = 0; i < items.length; i++) {
    var x = items[i].match(KEYVALI_REGEX);
    var key = x[1];
    var val = x[2];

    // for strings
    val = val.replace(/[\"\']/g, '');

    if (/^[\d]+$/.test(val)) {
      val = +val;
    }

    if (val === 'true' || val === 'false') {
      switch (val.toLowerCase().trim()) {
        case 'true':
          val = true;break;
        case 'false':
          val = false;break;
      }
    }
    stateData[key] = val;
  }

  return stateData;
};

exports.default = {
  addStateData: addStateData,
  getTopic: getTopic,
  processAlternates: processAlternates,
  topicSetter: topicSetter,
  wordnetReplace: wordnetReplace
};