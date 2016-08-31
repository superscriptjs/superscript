var debug = require("debug-levels")("SS:Utils");
var _ = require("lodash");
var Lex = require("parts-of-speech").Lexer;
var fs = require("fs");
const RE2 = require('re2')


const commasRE = new RE2(',', 'g')
const encodeCommas = s => s ? commasRE.replace(s, '<COMMA>') : s
exports.encodeCommas = encodeCommas

const encodedCommasRE = new RE2('<COMMA>', 'g')
exports.decodeCommas = s => s ? encodedCommasRE.replace(s, '<COMMA>') : s


const endsSpaceRE = new RE2('(^\\s+)|(\\s+$)', 'g')
const innerSpaceRE = new RE2('[ \\t]+', 'g')
// todo: rename to normlize to avoid confusion with string.trim() semantics
/**
 * Remove extra whitespace from a string, while preserving new lines.
 * @param {string} text - the string to tidy up
 */
exports.trim = (text = '') => innerSpaceRE.replace(endsSpaceRE.replace(text, ''), ' ')


const wordSepRE = new RE2('[\\s*#_|]+')
/**
 * Count the number of real words in a string
 * @param {string} text - the text to count
 * @returns {number} the number of words in `text`
 */
exports.wordCount = text => wordSepRE.split(text).filter(w => w.length > 0).length

// If needed, switch to _ or lodash
// Array.prototype.chunk = function (chunkSize) {
//   var R = [];
//   for (var i = 0; i < this.length; i += chunkSize) {
//     R.push(this.slice(i, i + chunkSize));
//   }
//   return R;
// };


// Contains with value being list
exports.inArray = function (list, value) {
  if (_.isArray(value)) {
    var match = false;
    for (var i = 0; i < value.length; i++) {
      if (_.includes(list, value[i]) > 0) {
        match = _.indexOf(list, value[i]);
      }
    }
    return match;
  } else {
    return _.indexOf(list, value);
  }
};

exports.sentenceSplit = function (message) {
  var lexer = new Lex();
  var bits = lexer.lex(message);
  var R = [];
  var L = [];
  for (var i = 0; i < bits.length; i++) {
    if (bits[i] === ".") {
      // Push the punct
      R.push(bits[i]);
      L.push(R.join(" "));
      R = [];
    } else if (bits[i] === "," &&
      R.length >= 3 &&
      _.includes(["who", "what", "where", "when", "why"], bits[i + 1])
    ) {
      R.push(bits[i]);
      L.push(R.join(" "));
      R = [];
    } else {
      R.push(bits[i]);
    }
  }

  // if we havd left over R, push it into L (no punct was found)
  if (R.length !== 0) {
    L.push(R.join(" "));
  }

  return L;
};


const commandsRE = new RE2('[\\\\.+?${}=!:]', 'g')
const nonCommandsRE = new RE2('[\\\\.+*?\\[^\\]$(){}=!<>|:]', 'g')
/**
 * Escape a string sp that it can be used in a regular expression.
 * @param {string}  string   - the string to escape
 * @param {boolean} commands -
 */
exports.quotemeta = (string, commands = false) => (commands ? commandsRE : nonCommandsRE).replace(string, c => `\\${c}`)


exports.cleanArray = function (actual) {
  var newArray = [];
  for (var i = 0; i < actual.length; i++) {
    if (actual[i]) {
      newArray.push(actual[i]);
    }
  }
  return newArray;
};


const aRE = new RE2('^(([bcdgjkpqtuvwyz]|onc?e|onetime)$|e[uw]|uk|ur[aeiou]|use|ut([^t])|uni(l[^l]|[a-ko-z]))', 'i')
const anRE = new RE2('^([aefhilmnorsx]$|hono|honest|hour|heir|[aeiou])', 'i')
const upcaseARE = new RE2('^(UN$)')
const upcaseANRE = new RE2('^$')
const dashSpaceRE = new RE2('[- ]')
const indefiniteArticlerize = word => {
  const first = dashSpaceRE.split(word, 2)[0]
  const prefix = (anRE.test(first) || upcaseARE.test(first)) && !(aRE.test(first) || upcaseANRE.test(first)) ? 'an' : 'a'
  return `${prefix} ${word}`
}
exports.indefiniteArticlerize = indefiniteArticlerize

exports.indefiniteList = list => {
  const n = list.map(indefiniteArticlerize)
  if (n.length > 1) {
    const last = n.pop();
    return `${n.join(', ')} and ${last}`
  } else {
    return n.join(", ")
  }
}

var getRandomInt = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

exports.getRandomInt = getRandomInt;

const underscoresRE = new RE2('_', 'g')
exports.pickItem = function (arr) {
  // TODO - Item may have a wornet suffix meal~2 or meal~n
  var ind = getRandomInt(0, arr.length - 1);
  return _.isString(arr[ind]) ? underscoresRE.replace(arr[ind], ' ') : arr[ind]
};


// todo: remove this, use _.capitalize instead
exports.ucwords = function (str) {
  return str.toLowerCase().replace(/\b[a-z]/g, function (letter) {
    return letter.toUpperCase();
  });
};

// Capital first letter, and add period.
exports.makeSentense = function (string) {
  return string.charAt(0).toUpperCase() + string.slice(1) + ".";
};


var tags = {
  wword: ["WDT", "WP", "WP$", "WRB"],
  nouns: ["NN", "NNP", "NNPS", "NNS"],
  verbs: ["VB", "VBD", "VBG", "VBN", "VBP", "VBZ"],
  adjectives: ["JJ", "JJR", "JJS"]
};

exports._isTag = function (pos, _class) {
  return !!(tags[_class].indexOf(pos) > -1);
};

exports.mkdirSync = function (path) {
  try {
    fs.mkdirSync(path);
  } catch(e) {
    if (e.code !== "EEXIST") {
      throw e;
    }
  }
};

exports.genId = function () {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 8; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};


const capRE = new RE2('<cap([0-9]*)>', 'ig')
/**
 * Search each string in `strings` for `<cap>` tags and replace them with values from `caps`.
 *
 * Replacement is positional so `<cap1>` replaces with `caps[1]` and so on, with `<cap>` also replacing from `caps[1]`.
 * Empty `strings` are removed from the result.
 *
 * @param {Array<string>} strings - text to search for `<cap>` tags
 * @param {Array<string>} caps - replacement text
 */
exports.replaceCapturedText = (strings, caps) => {
  const encoded = caps.map(s => encodeCommas(s))
  return strings.filter(s => !_.isEmpty(s)).map(s => capRE.replace(s, (m, p1) => encoded[Number.parseInt(p1 || 1)]))
}


var walk = function (dir, done) {

  if (fs.statSync(dir).isFile()) {
    debug.verbose("Expected directory, found file, simulating directory with only one file: %s", dir)
    return done(null, [dir]);
  }

  var results = [];
  fs.readdir(dir, function (err1, list) {
    if (err1) {
      return done(err1);
    }
    var pending = list.length;
    if (!pending) {
      return done(null, results);
    }
    list.forEach(function (file) {
      file = dir + "/" + file;
      fs.stat(file, function (err2, stat) {
        if (err2) {
          console.log(err2);
        }

        if (stat && stat.isDirectory()) {
          var cbf = function (err3, res) {
            results = results.concat(res);
            if (!--pending) {
              done(err3, results);
            }
          };

          walk(file, cbf);
        } else {
          results.push(file);
          if (!--pending) {
            done(null, results);
          }
        }
      });
    });
  });
};

exports.walk = walk;
