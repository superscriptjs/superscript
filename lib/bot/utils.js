'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _string = require('string');

var _string2 = _interopRequireDefault(_string);

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

var _partsOfSpeech = require('parts-of-speech');

var _partsOfSpeech2 = _interopRequireDefault(_partsOfSpeech);

var _re = require('re2');

var _re2 = _interopRequireDefault(_re);

var _regexes = require('./regexes');

var _regexes2 = _interopRequireDefault(_regexes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debugLevels2.default)('SS:Utils');
var Lex = _partsOfSpeech2.default.Lexer;

//--------------------------

var encodeCommas = function encodeCommas(s) {
  return s ? _regexes2.default.commas.replace(s, '<COMMA>') : s;
};

var encodedCommasRE = new _re2.default('<COMMA>', 'g');
var decodeCommas = function decodeCommas(s) {
  return s ? encodedCommasRE.replace(s, '<COMMA>') : s;
};

// TODO: rename to normlize to avoid confusion with string.trim() semantics
/**
 * Remove extra whitespace from a string, while preserving new lines.
 * @param {string} text - the string to tidy up
 */
var trim = function trim() {
  var text = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  return _regexes2.default.space.inner.replace(_regexes2.default.whitespace.both.replace(text, ''), ' ');
};

var wordSepRE = new _re2.default('[\\s*#_|]+');
/**
 * Count the number of real words in a string
 * @param {string} text - the text to count
 * @returns {number} the number of words in `text`
 */
var wordCount = function wordCount(text) {
  return wordSepRE.split(text).filter(function (w) {
    return w.length > 0;
  }).length;
};

// If needed, switch to _ or lodash
// Array.prototype.chunk = function (chunkSize) {
//   var R = [];
//   for (var i = 0; i < this.length; i += chunkSize) {
//     R.push(this.slice(i, i + chunkSize));
//   }
//   return R;
// };

// Contains with value being list
var inArray = function inArray(list, value) {
  if (_lodash2.default.isArray(value)) {
    var match = false;
    for (var i = 0; i < value.length; i++) {
      if (_lodash2.default.includes(list, value[i]) > 0) {
        match = _lodash2.default.indexOf(list, value[i]);
      }
    }
    return match;
  } else {
    return _lodash2.default.indexOf(list, value);
  }
};

var sentenceSplit = function sentenceSplit(message) {
  var lexer = new Lex();
  var bits = lexer.lex(message);
  var R = [];
  var L = [];
  for (var i = 0; i < bits.length; i++) {
    if (bits[i] === '.') {
      // Push the punct
      R.push(bits[i]);
      L.push(R.join(' '));
      R = [];
    } else if (bits[i] === ',' && R.length >= 3 && _lodash2.default.includes(['who', 'what', 'where', 'when', 'why'], bits[i + 1])) {
      R.push(bits[i]);
      L.push(R.join(' '));
      R = [];
    } else {
      R.push(bits[i]);
    }
  }

  // if we havd left over R, push it into L (no punct was found)
  if (R.length !== 0) {
    L.push(R.join(' '));
  }

  return L;
};

var commandsRE = new _re2.default('[\\\\.+?${}=!:]', 'g');
var nonCommandsRE = new _re2.default('[\\\\.+*?\\[^\\]$(){}=!<>|:]', 'g');
/**
 * Escape a string sp that it can be used in a regular expression.
 * @param {string}  string   - the string to escape
 * @param {boolean} commands -
 */
var quotemeta = function quotemeta(string) {
  var commands = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  return (commands ? commandsRE : nonCommandsRE).replace(string, function (c) {
    return '\\' + c;
  });
};

var cleanArray = function cleanArray(actual) {
  var newArray = [];
  for (var i = 0; i < actual.length; i++) {
    if (actual[i]) {
      newArray.push(actual[i]);
    }
  }
  return newArray;
};

var aRE = new _re2.default('^(([bcdgjkpqtuvwyz]|onc?e|onetime)$|e[uw]|uk|ur[aeiou]|use|ut([^t])|uni(l[^l]|[a-ko-z]))', 'i');
var anRE = new _re2.default('^([aefhilmnorsx]$|hono|honest|hour|heir|[aeiou])', 'i');
var upcaseARE = new _re2.default('^(UN$)');
var upcaseANRE = new _re2.default('^$');
var dashSpaceRE = new _re2.default('[- ]');
var indefiniteArticlerize = function indefiniteArticlerize(word) {
  var first = dashSpaceRE.split(word, 2)[0];
  var prefix = (anRE.test(first) || upcaseARE.test(first)) && !(aRE.test(first) || upcaseANRE.test(first)) ? 'an' : 'a';
  return prefix + ' ' + word;
};

var indefiniteList = function indefiniteList(list) {
  var n = list.map(indefiniteArticlerize);
  if (n.length > 1) {
    var last = n.pop();
    return n.join(', ') + ' and ' + last;
  } else {
    return n.join(', ');
  }
};

var getRandomInt = function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

var underscoresRE = new _re2.default('_', 'g');
var pickItem = function pickItem(arr) {
  // TODO - Item may have a wornet suffix meal~2 or meal~n
  var ind = getRandomInt(0, arr.length - 1);
  return _lodash2.default.isString(arr[ind]) ? underscoresRE.replace(arr[ind], ' ') : arr[ind];
};

// Capital first letter, and add period.
var makeSentense = function makeSentense(string) {
  return string.charAt(0).toUpperCase() + string.slice(1) + '.';
};

var tags = {
  wword: ['WDT', 'WP', 'WP$', 'WRB'],
  nouns: ['NN', 'NNP', 'NNPS', 'NNS'],
  verbs: ['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ'],
  adjectives: ['JJ', 'JJR', 'JJS']
};

var isTag = function isTag(posTag, wordClass) {
  return !!(tags[wordClass].indexOf(posTag) > -1);
};

var genId = function genId() {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < 8; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

/**
 * Search each string in `strings` for `<cap>` tags and replace them with values from `caps`.
 *
 * Replacement is positional so `<cap1>` replaces with `caps[1]` and so on, with `<cap>` also replacing from `caps[1]`.
 * Empty `strings` are removed from the result.
 *
 * @param {Array<string>} strings - text to search for `<cap>` tags
 * @param {Array<string>} caps - replacement text
 */
var replaceCapturedText = function replaceCapturedText(strings, caps) {
  var encoded = caps.map(function (s) {
    return encodeCommas(s);
  });
  return strings.filter(function (s) {
    return !_lodash2.default.isEmpty(s);
  }).map(function (s) {
    return _regexes2.default.captures.replace(s, function (m, p1) {
      return encoded[Number.parseInt(p1 || 1)];
    });
  });
};

var walk = function walk(dir, done) {
  if (_fs2.default.statSync(dir).isFile()) {
    debug.verbose('Expected directory, found file, simulating directory with only one file: %s', dir);
    return done(null, [dir]);
  }

  var results = [];
  _fs2.default.readdir(dir, function (err1, list) {
    if (err1) {
      return done(err1);
    }
    var pending = list.length;
    if (!pending) {
      return done(null, results);
    }
    list.forEach(function (file) {
      file = dir + '/' + file;
      _fs2.default.stat(file, function (err2, stat) {
        if (err2) {
          console.log(err2);
        }

        if (stat && stat.isDirectory()) {
          var cbf = function cbf(err3, res) {
            results = results.concat(res);
            pending -= 1;
            if (!pending) {
              done(err3, results);
            }
          };

          walk(file, cbf);
        } else {
          results.push(file);
          pending -= 1;
          if (!pending) {
            done(null, results);
          }
        }
      });
    });
  });
};

var pennToWordnet = function pennToWordnet(pennTag) {
  if ((0, _string2.default)(pennTag).startsWith('J')) {
    return 'a';
  } else if ((0, _string2.default)(pennTag).startsWith('V')) {
    return 'v';
  } else if ((0, _string2.default)(pennTag).startsWith('N')) {
    return 'n';
  } else if ((0, _string2.default)(pennTag).startsWith('R')) {
    return 'r';
  } else {
    return null;
  }
};

exports.default = {
  cleanArray: cleanArray,
  encodeCommas: encodeCommas,
  decodeCommas: decodeCommas,
  genId: genId,
  getRandomInt: getRandomInt,
  inArray: inArray,
  indefiniteArticlerize: indefiniteArticlerize,
  indefiniteList: indefiniteList,
  isTag: isTag,
  makeSentense: makeSentense,
  pennToWordnet: pennToWordnet,
  pickItem: pickItem,
  quotemeta: quotemeta,
  replaceCapturedText: replaceCapturedText,
  sentenceSplit: sentenceSplit,
  trim: trim,
  walk: walk,
  wordCount: wordCount
};