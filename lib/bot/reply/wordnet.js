'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _natural = require('natural');

var _natural2 = _interopRequireDefault(_natural);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var wordnet = new _natural2.default.WordNet(); // This is a shim for wordnet lookup.
// http://wordnet.princeton.edu/wordnet/man/wninput.5WN.html

var define = function define(word, cb) {
  wordnet.lookup(word, function (results) {
    if (!_lodash2.default.isEmpty(results)) {
      cb(null, results[0].def);
    } else {
      cb('No results for wordnet definition of \'' + word + '\'');
    }
  });
};

// Does a word lookup
// @word can be a word or a word/pos to filter out unwanted types
var lookup = function lookup(word) {
  var pointerSymbol = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '~';
  var cb = arguments[2];

  var pos = null;

  var match = word.match(/~(\w)$/);
  if (match) {
    pos = match[1];
    word = word.replace(match[0], '');
  }

  var synets = [];

  wordnet.lookup(word, function (results) {
    results.forEach(function (result) {
      result.ptrs.forEach(function (part) {
        if (pos !== null && part.pos === pos && part.pointerSymbol === pointerSymbol) {
          synets.push(part);
        } else if (pos === null && part.pointerSymbol === pointerSymbol) {
          synets.push(part);
        }
      });
    });

    var itor = function itor(word, next) {
      wordnet.get(word.synsetOffset, word.pos, function (sub) {
        next(null, sub.lemma);
      });
    };

    _async2.default.map(synets, itor, function (err, items) {
      items = _lodash2.default.uniq(items);
      items = items.map(function (x) {
        return x.replace(/_/g, ' ');
      });
      cb(err, items);
    });
  });
};

// Used to explore a word or concept
// Spits out lots of info on the word
var explore = function explore(word, cb) {
  var ptrs = [];

  wordnet.lookup(word, function (results) {
    for (var i = 0; i < results.length; i++) {
      ptrs.push(results[i].ptrs);
    }

    ptrs = _lodash2.default.uniq(_lodash2.default.flatten(ptrs));
    ptrs = _lodash2.default.map(ptrs, function (item) {
      return { pos: item.pos, sym: item.pointerSymbol };
    });

    ptrs = _lodash2.default.chain(ptrs).groupBy('pos').map(function (value, key) {
      return {
        pos: key,
        ptr: _lodash2.default.uniq(_lodash2.default.map(value, 'sym'))
      };
    }).value();

    var itor = function itor(item, next) {
      var itor2 = function itor2(ptr, next2) {
        lookup(word + '~' + item.pos, ptr, function (err, res) {
          if (err) {
            console.error(err);
          }
          console.log(word, item.pos, ':', ptr, res.join(', '));
          next2();
        });
      };
      _async2.default.map(item.ptr, itor2, next);
    };
    _async2.default.each(ptrs, itor, function () {
      return cb();
    });
  });
};

exports.default = {
  define: define,
  explore: explore,
  lookup: lookup
};