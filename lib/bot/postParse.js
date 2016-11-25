'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _re = require('re2');

var _re2 = _interopRequireDefault(_re);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Insert replacements into `source` string
 *
 * - `<basename>` gets replaced by `(replacements[0])`
 * - `<basenames>` gets replaced by `(replacements[0]|replacements[1]|...)`
 * - `<basenameN>` gets replaced by `(replacements[N])`
 *
 * @param {string} basename
 * @param {string} source
 * @param {Array} replacements
 * @returns {string}
 */
var replaceOneOrMore = function replaceOneOrMore(basename, source, replacements) {
  var pronounsRE = new _re2.default('<(' + basename + ')([s0-' + replacements.length + '])?>', 'g');
  if (pronounsRE.search(source) !== -1 && replacements.length !== 0) {
    return pronounsRE.replace(source, function (c, p1, p2) {
      if (p1 === 's') {
        return '(' + replacements.join('|') + ')';
      } else {
        var index = Number.parseInt(p2);
        index = index ? index - 1 : 0;
        return '(' + replacements[index] + ')';
      }
    });
  } else {
    return source;
  }
};

/**
 * This function replaces syntax in the trigger such as:
 * <noun1> <adverb2> <pronoun2>
 * with the respective word in the user's message.
 *
 * This function can be done after the first and contains the
 * user object so it may be contextual to this user.
 */
var postParse = function postParse(regexp, message, user, callback) {
  if (_lodash2.default.isNull(regexp)) {
    callback(null);
  } else {
    // TODO: this can all be done in a single pass
    regexp = replaceOneOrMore('name', regexp, message.names);
    regexp = replaceOneOrMore('noun', regexp, message.nouns);
    regexp = replaceOneOrMore('adverb', regexp, message.adverbs);
    regexp = replaceOneOrMore('verb', regexp, message.verbs);
    regexp = replaceOneOrMore('pronoun', regexp, message.pronouns);
    regexp = replaceOneOrMore('adjective', regexp, message.adjectives);

    var inputOrReplyRE = new _re2.default('<(input|reply)([1-9])?>', 'g');
    if (inputOrReplyRE.search(regexp) !== -1) {
      (function () {
        var history = user.history;
        regexp = inputOrReplyRE.replace(regexp, function (c, p1, p2) {
          var index = p2 ? Number.parseInt(p2) : 0;
          return history[p1][index] ? history[p1][index].raw : c;
        });
      })();
    }
  }

  callback(regexp);
};

exports.default = postParse;