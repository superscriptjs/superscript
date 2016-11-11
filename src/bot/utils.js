import _ from 'lodash';
import fs from 'fs';
import string from 'string';
import debuglog from 'debug-levels';
import pos from 'parts-of-speech';
import RE2 from 're2';
import regexes from './regexes';

const debug = debuglog('SS:Utils');
const Lex = pos.Lexer;

//--------------------------

const encodeCommas = s => (s ? regexes.commas.replace(s, '<COMMA>') : s);

const encodedCommasRE = new RE2('<COMMA>', 'g');
const decodeCommas = s => (s ? encodedCommasRE.replace(s, '<COMMA>') : s);

// TODO: rename to normlize to avoid confusion with string.trim() semantics
/**
 * Remove extra whitespace from a string, while preserving new lines.
 * @param {string} text - the string to tidy up
 */
const trim = (text = '') => regexes.space.inner.replace(regexes.whitespace.both.replace(text, ''), ' ');

const wordSepRE = new RE2('[\\s*#_|]+');
/**
 * Count the number of real words in a string
 * @param {string} text - the text to count
 * @returns {number} the number of words in `text`
 */
const wordCount = text => wordSepRE.split(text).filter(w => w.length > 0).length;

// If needed, switch to _ or lodash
// Array.prototype.chunk = function (chunkSize) {
//   var R = [];
//   for (var i = 0; i < this.length; i += chunkSize) {
//     R.push(this.slice(i, i + chunkSize));
//   }
//   return R;
// };

// Contains with value being list
const inArray = function inArray(list, value) {
  if (_.isArray(value)) {
    let match = false;
    for (let i = 0; i < value.length; i++) {
      if (_.includes(list, value[i]) > 0) {
        match = _.indexOf(list, value[i]);
      }
    }
    return match;
  } else {
    return _.indexOf(list, value);
  }
};

const sentenceSplit = function sentenceSplit(message) {
  const lexer = new Lex();
  const bits = lexer.lex(message);
  let R = [];
  const L = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '.') {
      // Push the punct
      R.push(bits[i]);
      L.push(R.join(' '));
      R = [];
    } else if (bits[i] === ',' &&
      R.length >= 3 &&
      _.includes(['who', 'what', 'where', 'when', 'why'], bits[i + 1])
    ) {
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

const commandsRE = new RE2('[\\\\.+?${}=!:]', 'g');
const nonCommandsRE = new RE2('[\\\\.+*?\\[^\\]$(){}=!<>|:]', 'g');
/**
 * Escape a string sp that it can be used in a regular expression.
 * @param {string}  string   - the string to escape
 * @param {boolean} commands -
 */
const quotemeta = (string, commands = false) => (commands ? commandsRE : nonCommandsRE).replace(string, c => `\\${c}`);

const cleanArray = function cleanArray(actual) {
  const newArray = [];
  for (let i = 0; i < actual.length; i++) {
    if (actual[i]) {
      newArray.push(actual[i]);
    }
  }
  return newArray;
};

const aRE = new RE2('^(([bcdgjkpqtuvwyz]|onc?e|onetime)$|e[uw]|uk|ur[aeiou]|use|ut([^t])|uni(l[^l]|[a-ko-z]))', 'i');
const anRE = new RE2('^([aefhilmnorsx]$|hono|honest|hour|heir|[aeiou])', 'i');
const upcaseARE = new RE2('^(UN$)');
const upcaseANRE = new RE2('^$');
const dashSpaceRE = new RE2('[- ]');
const indefiniteArticlerize = (word) => {
  const first = dashSpaceRE.split(word, 2)[0];
  const prefix = (anRE.test(first) || upcaseARE.test(first)) && !(aRE.test(first) || upcaseANRE.test(first)) ? 'an' : 'a';
  return `${prefix} ${word}`;
};

const indefiniteList = (list) => {
  const n = list.map(indefiniteArticlerize);
  if (n.length > 1) {
    const last = n.pop();
    return `${n.join(', ')} and ${last}`;
  } else {
    return n.join(', ');
  }
};

const getRandomInt = function getRandomInt(min, max) {
  return Math.floor(Math.random() * ((max - min) + 1)) + min;
};

const underscoresRE = new RE2('_', 'g');
const pickItem = function pickItem(arr) {
  // TODO - Item may have a wornet suffix meal~2 or meal~n
  const ind = getRandomInt(0, arr.length - 1);
  return _.isString(arr[ind]) ? underscoresRE.replace(arr[ind], ' ') : arr[ind];
};

// Capital first letter, and add period.
const makeSentense = function makeSentense(string) {
  return `${string.charAt(0).toUpperCase() + string.slice(1)}.`;
};

const tags = {
  wword: ['WDT', 'WP', 'WP$', 'WRB'],
  nouns: ['NN', 'NNP', 'NNPS', 'NNS'],
  verbs: ['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ'],
  adjectives: ['JJ', 'JJR', 'JJS'],
};

const isTag = function isTag(posTag, wordClass) {
  return !!(tags[wordClass].indexOf(posTag) > -1);
};

const genId = function genId() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 8; i++) {
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
const replaceCapturedText = (strings, caps) => {
  const encoded = caps.map(s => encodeCommas(s));
  return strings
      .filter(s => !_.isEmpty(s))
      .map(s => regexes.captures.replace(s, (m, p1) => encoded[Number.parseInt(p1 || 1)]));
};

const walk = function walk(dir, done) {
  if (fs.statSync(dir).isFile()) {
    debug.verbose('Expected directory, found file, simulating directory with only one file: %s', dir);
    return done(null, [dir]);
  }

  let results = [];
  fs.readdir(dir, (err1, list) => {
    if (err1) {
      return done(err1);
    }
    let pending = list.length;
    if (!pending) {
      return done(null, results);
    }
    list.forEach((file) => {
      file = `${dir}/${file}`;
      fs.stat(file, (err2, stat) => {
        if (err2) {
          console.log(err2);
        }

        if (stat && stat.isDirectory()) {
          const cbf = function cbf(err3, res) {
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

const pennToWordnet = function pennToWordnet(pennTag) {
  if (string(pennTag).startsWith('J')) {
    return 'a';
  } else if (string(pennTag).startsWith('V')) {
    return 'v';
  } else if (string(pennTag).startsWith('N')) {
    return 'n';
  } else if (string(pennTag).startsWith('R')) {
    return 'r';
  } else {
    return null;
  }
};

export default {
  cleanArray,
  encodeCommas,
  decodeCommas,
  genId,
  getRandomInt,
  inArray,
  indefiniteArticlerize,
  indefiniteList,
  isTag,
  makeSentense,
  pennToWordnet,
  pickItem,
  quotemeta,
  replaceCapturedText,
  sentenceSplit,
  trim,
  walk,
  wordCount,
};
