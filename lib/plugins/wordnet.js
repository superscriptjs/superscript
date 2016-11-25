'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _wordnet = require('../bot/reply/wordnet');

var _wordnet2 = _interopRequireDefault(_wordnet);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var wordnetDefine = function wordnetDefine(cb) {
  var args = Array.prototype.slice.call(arguments);
  var word = void 0;

  if (args.length === 2) {
    word = args[0];
  } else {
    word = this.message.words.pop();
  }

  _wordnet2.default.define(word, function (err, result) {
    cb(null, 'The Definition of ' + word + ' is ' + result);
  });
};

exports.default = { wordnetDefine: wordnetDefine };