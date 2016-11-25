'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debugLevels2.default)('SS:History');

// This function walks the history input and looks for utterances previously spoken
// to help answer the or solidify the statement
var historyLookup = function historyLookup(user, options) {
  debug.verbose('History Lookup with', options);

  var candidates = [];
  var nn = void 0;

  var moneyWords = function moneyWords(item) {
    return item[1] === '$' || item[0] === 'quid' || item[0] === 'pounds' || item[0] === 'dollars' || item[0] === 'bucks' || item[0] === 'cost';
  };

  var _loop = function _loop(i) {
    var pobj = user.history.input[i];

    if (pobj !== undefined) {
      // TODO - See why we are getting a nested array.
      if (Array.isArray(pobj)) {
        pobj = pobj[0];
      }

      if (options.numbers || options.number) {
        if (pobj.numbers.length !== 0) {
          candidates.push(pobj);
        }
      }

      // Special case of number
      if (options.money === true && options.nouns) {
        if (pobj.numbers.length !== 0) {
          var t = [];
          if (_lodash2.default.any(pobj.taggedWords, moneyWords)) {
            t.push(pobj);

            // Now filter out the nouns
            for (var n = 0; n < t.length; n++) {
              nn = _lodash2.default.any(t[n].nouns, function (item) {
                for (var j = 0; j < options.nouns.length; j++) {
                  return options.nouns[i] === item ? true : false;
                }
              });
            }

            if (nn) {
              candidates.push(pobj);
            }
          }
        }
      } else if (options.money && pobj) {
        if (pobj.numbers.length !== 0) {
          if (_lodash2.default.any(pobj.taggedWords, moneyWords)) {
            candidates.push(pobj);
          }
        }
      } else if (options.nouns && pobj) {
        debug.verbose('Noun Lookup');
        if (_lodash2.default.isArray(options.nouns)) {
          s = 0;
          c = 0;


          nn = _lodash2.default.any(pobj.nouns, function (item) {
            var x = _lodash2.default.includes(options.nouns, item);
            c++;
            s = x ? s + 1 : s;
            return x;
          });

          if (nn) {
            pobj.score = s / c;
            candidates.push(pobj);
          }
        } else if (pobj.nouns.length !== 0) {
          candidates.push(pobj);
        }
      } else if (options.names && pobj) {
        debug.verbose('Name Lookup');

        if (_lodash2.default.isArray(options.names)) {
          nn = _lodash2.default.any(pobj.names, function (item) {
            return _lodash2.default.includes(options.names, item);
          });
          if (nn) {
            candidates.push(pobj);
          }
        } else if (pobj.names.length !== 0) {
          candidates.push(pobj);
        }
      } else if (options.adjectives && pobj) {
        debug.verbose('adjectives Lookup');
        if (_lodash2.default.isArray(options.adjectives)) {
          s = 0;
          c = 0;

          nn = _lodash2.default.any(pobj.adjectives, function (item) {
            var x = _lodash2.default.includes(options.adjectives, item);
            c++;
            s = x ? s + 1 : s;
            return x;
          });

          if (nn) {
            pobj.score = s / c;
            candidates.push(pobj);
          }
        } else if (pobj.adjectives.length !== 0) {
          candidates.push(pobj);
        }
      }

      if (options.date && pobj) {
        if (pobj.date !== null) {
          candidates.push(pobj);
        }
      }
    }
  };

  for (var i = 0; i < user.history.input.length; i++) {
    var s;
    var c;

    _loop(i);
  }

  return candidates;
};

exports.default = historyLookup;