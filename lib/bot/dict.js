'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = (0, _debugLevels2.default)('SS:Dict');

var Dict = function () {
  function Dict(wordArray) {
    _classCallCheck(this, Dict);

    this.words = [];

    for (var i = 0; i < wordArray.length; i++) {
      this.words.push({ word: wordArray[i], position: i });
    }
  }

  _createClass(Dict, [{
    key: 'add',
    value: function add(key, array) {
      for (var i = 0; i < array.length; i++) {
        this.words[i][key] = array[i];
      }
    }
  }, {
    key: 'get',
    value: function get(word) {
      debug.verbose('Getting word from dictionary: ' + word);
      for (var i = 0; i < this.words.length; i++) {
        if (this.words[i].word === word || this.words[i].lemma === word) {
          return this.words[i];
        }
      }
      return null;
    }
  }, {
    key: 'contains',
    value: function contains(word) {
      for (var i = 0; i < this.words.length; i++) {
        if (this.words[i].word === word || this.words[i].lemma === word) {
          return true;
        }
      }
      return false;
    }
  }, {
    key: 'addHLC',
    value: function addHLC(array) {
      debug.verbose('Adding HLCs to dictionary: ' + array);
      var extra = [];
      for (var i = 0; i < array.length; i++) {
        var word = array[i].word;
        var concepts = array[i].hlc;
        var item = this.get(word);
        if (item) {
          item.hlc = concepts;
        } else {
          debug.verbose('HLC extra or missing for word/phrase: ' + word);
          extra.push(word);
        }
      }
      return extra;
    }
  }, {
    key: 'getHLC',
    value: function getHLC(concept) {
      for (var i = 0; i < this.words.length; i++) {
        if (_lodash2.default.includes(this.words[i].hlc, concept)) {
          return this.words[i];
        }
      }
      return null;
    }
  }, {
    key: 'containsHLC',
    value: function containsHLC(concept) {
      for (var i = 0; i < this.words.length; i++) {
        if (_lodash2.default.includes(this.words[i].hlc, concept)) {
          return true;
        }
      }
      return false;
    }
  }, {
    key: 'fetch',
    value: function fetch(list, thing) {
      var results = [];
      for (var i = 0; i < this.words.length; i++) {
        if (_lodash2.default.isArray(thing)) {
          if (_lodash2.default.includes(thing, this.words[i][list])) {
            results.push(this.words[i].lemma);
          }
        } else if (_lodash2.default.isArray(this.words[i][list])) {
          if (_lodash2.default.includes(this.words[i][list], thing)) {
            results.push(this.words[i].lemma);
          }
        }
      }
      return results;
    }
  }, {
    key: 'findByLem',
    value: function findByLem(word) {
      for (var i = 0; i < this.words.length; i++) {
        if (this.words[i].lemma === word) {
          return this.words[i];
        }
      }
      return null;
    }
  }]);

  return Dict;
}();

exports.default = Dict;