var debug = require("debug")("Utils");
var _ = require("lodash");
var Lex = require("parts-of-speech").Lexer;
var fs = require("fs");

// Strip whitespace from a string.
// We preserve new lines
exports.trim = function (text) {
  var before = text;
  text = text || "";
  text = text.replace(/^[\s\t]+/i, "");
  text = text.replace(/[\s\t]+$/i, "");
  text = text.replace(/[ \t]{2,}/g, " ");

  if (before !== text) {
    debug("Trim", before, text);
  }
  return text;
};

// Count real words in a string.
exports.wordCount = function (trigger) {
  var words = [];
  words = trigger.split(/[\s\*\#\_\|]+/);

  var wc = 0;
  for (var i = 0, end = words.length; i < end; i++) {
    if (words[i].length > 0) {
      wc++;
    }
  }

  return wc;
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
exports.inArray = function (list, value) {
  if (_.isArray(value)) {
    var match = false;
    for (var i = 0; i < value.length; i++) {
      if (_.contains(list, value[i]) > 0) {
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
      _.contains(["who", "what", "where", "when", "why"], bits[i + 1])
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

// Escape a string for a regexp.
exports.quotemeta = function (string, commands) {
  commands = commands || false;
  var unsafe = commands ? "\\.+?${}=!:" : "\\.+*?[^]$(){}=!<>|:";
  for (var i = 0; i < unsafe.length; i++) {
    string = string.replace(new RegExp("\\" + unsafe.charAt(i), "g"), "\\" + unsafe.charAt(i));
  }
  return string;
};

exports.cleanArray = function (actual) {
  var newArray = [];
  for (var i = 0; i < actual.length; i++) {
    if (actual[i]) {
      newArray.push(actual[i]);
    }
  }
  return newArray;
};

/*eslint max-len:0 */
var indefiniteArticlerize = function (word) {
  var A = /^(([bcdgjkpqtuvwyz]|onc?e|onetime)$|e[uw]|uk|ur[aeiou]|use|ut([^t])|uni(l[^l]|[a-ko-z]))/i;
  var AN = /^([aefhilmnorsx]$|hono|honest|hour|heir|[aeiou])/i;
  var UPCASE_A_REQUIRING_PATTERNS = /^(UN$)/;
  var UPCASE_AN_REQUIRING_PATTERNS = /^$/;

  var firstWord = String(word).split(/[- ]/)[0];
  if ((AN.test(firstWord) || UPCASE_AN_REQUIRING_PATTERNS.test(firstWord)) &&
     !(A.test(firstWord) || UPCASE_A_REQUIRING_PATTERNS.test(firstWord))) {
    return "an " + word;
  } else {
    return "a " + word;
  }
};
exports.indefiniteArticlerize = indefiniteArticlerize;

exports.indefiniteList = function (list) {
  var n = [];
  for (var i = 0; i < list.length; i++) {
    n.push(indefiniteArticlerize(list[i]));
  }
  if (n.length > 1) {
    var last = n.pop();
    return n.join(", ") + " and " + last;
  } else {
    return n.join(", ");
  }
};

var getRandomInt = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

exports.getRandomInt = getRandomInt;

exports.pickItem = function (arr) {
  // TODO - Item may have a wornet suffix meal~2 or meal~n
  var ind = getRandomInt(0, arr.length - 1);
  if (_.isString(arr[ind])) {
    return arr[ind].replace(/_/g, " ");
  } else {
    return arr[ind];
  }
};

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


var walk = function (dir, done) {

  if (fs.statSync(dir).isFile()) {
    debug("Expected directory, found file, simulating directory with only one file: " + dir);
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
