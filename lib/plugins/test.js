'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// This is used in a test to verify fall though works
// TODO: Move this into a fixture.
var bail = function bail(cb) {
  cb(true, null);
};

var one = function one(cb) {
  cb(null, 'one');
};

var num = function num(n, cb) {
  cb(null, n);
};

var changetopic = function changetopic(n, cb) {
  this.user.setTopic(n, function () {
    return cb(null, '');
  });
};

var changefunctionreply = function changefunctionreply(newtopic, cb) {
  cb(null, '{topic=' + newtopic + '}');
};

var doSomething = function doSomething(cb) {
  console.log('this.message.raw', this.message.raw);
  cb(null, 'function');
};

var breakFunc = function breakFunc(cb) {
  cb(null, '', true);
};

var nobreak = function nobreak(cb) {
  cb(null, '', false);
};

var objparam1 = function objparam1(cb) {
  var data = {
    text: 'world',
    attachments: [{
      text: 'Optional text that appears *within* the attachment'
    }]
  };
  cb(null, data);
};

var objparam2 = function objparam2(cb) {
  cb(null, { test: 'hello', text: 'world' });
};

var showScope = function showScope(cb) {
  cb(null, this.extraScope.key + ' ' + this.user.id + ' ' + this.message.clean);
};

var word = function word(word1, word2, cb) {
  cb(null, word1 === word2);
};

var hasFirstName = function hasFirstName(bool, cb) {
  this.user.getVar('firstName', function (e, name) {
    if (name !== null) {
      cb(null, bool === 'true');
    } else {
      cb(null, bool === 'false');
    }
  });
};

var getUserId = function getUserId(cb) {
  var userID = this.user.id;
  var that = this;
  // console.log("CMP1", _.isEqual(userID, that.user.id));
  return that.bot.getUser('userB', function (err, user) {
    console.log('CMP2', _lodash2.default.isEqual(userID, that.user.id));
    cb(null, that.user.id);
  });
};

var hasName = function hasName(bool, cb) {
  this.user.getVar('name', function (e, name) {
    if (name !== null) {
      cb(null, bool === 'true');
    } else {
      // We have no name
      cb(null, bool === 'false');
    }
  });
};

exports.default = {
  bail: bail,
  breakFunc: breakFunc,
  doSomething: doSomething,
  changefunctionreply: changefunctionreply,
  changetopic: changetopic,
  getUserId: getUserId,
  hasFirstName: hasFirstName,
  hasName: hasName,
  nobreak: nobreak,
  num: num,
  objparam1: objparam1,
  objparam2: objparam2,
  one: one,
  showScope: showScope,
  word: word
};