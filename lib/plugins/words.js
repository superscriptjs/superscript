'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pluralize = require('pluralize');

var _pluralize2 = _interopRequireDefault(_pluralize);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _utils = require('../bot/utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug2.default)('Word Plugin');

var plural = function plural(word, cb) {
  // Sometimes WordNet will give us more then one word
  var reply = void 0;
  var parts = word.split(' ');

  if (parts.length === 2) {
    reply = _pluralize2.default.plural(parts[0]) + ' ' + parts[1];
  } else {
    reply = _pluralize2.default.plural(word);
  }

  cb(null, reply);
};

var not = function not(word, cb) {
  var words = word.split('|');
  var results = _utils2.default.inArray(this.message.words, words);
  debug('RES', results);
  cb(null, results === false);
};

var lowercase = function lowercase(word, cb) {
  if (word) {
    cb(null, word.toLowerCase());
  } else {
    cb(null, '');
  }
};

exports.default = {
  lowercase: lowercase,
  not: not,
  plural: plural
};