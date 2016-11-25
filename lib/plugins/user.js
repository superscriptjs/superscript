'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug2.default)('SS:UserFacts');

var save = function save(key, value, cb) {
  var memory = this.user.memory;
  var userId = this.user.id;

  if (arguments.length !== 3) {
    console.log('WARNING\nValue not found in save function.');
    if (_lodash2.default.isFunction(value)) {
      cb = value;
      value = '';
    }
  }

  memory.db.get({ subject: key, predicate: userId }, function (err, results) {
    if (!_lodash2.default.isEmpty(results)) {
      memory.db.del(results[0], function () {
        memory.db.put({ subject: key, predicate: userId, object: value }, function () {
          cb(null, '');
        });
      });
    } else {
      memory.db.put({ subject: key, predicate: userId, object: value }, function (err) {
        cb(null, '');
      });
    }
  });
};

var hasItem = function hasItem(key, bool, cb) {
  var memory = this.user.memory;
  var userId = this.user.id;

  debug('getVar', key, bool, userId);
  memory.db.get({ subject: key, predicate: userId }, function (err, res) {
    if (!_lodash2.default.isEmpty(res)) {
      cb(null, bool === 'true');
    } else {
      cb(null, bool === 'false');
    }
  });
};

var get = function get(key, cb) {
  var memory = this.user.memory;
  var userId = this.user.id;

  debug('getVar', key, userId);

  memory.db.get({ subject: key, predicate: userId }, function (err, res) {
    if (res && res.length !== 0) {
      cb(err, res[0].object);
    } else {
      cb(err, '');
    }
  });
};

var createUserFact = function createUserFact(s, v, o, cb) {
  this.user.memory.create(s, v, o, false, function () {
    cb(null, '');
  });
};

var known = function known(bool, cb) {
  var memory = this.user.memory;
  var name = this.message.names && !_lodash2.default.isEmpty(this.message.names) ? this.message.names[0] : '';
  memory.db.get({ subject: name.toLowerCase() }, function (err, res1) {
    memory.db.get({ object: name.toLowerCase() }, function (err, res2) {
      if (_lodash2.default.isEmpty(res1) && _lodash2.default.isEmpty(res2)) {
        cb(null, bool === 'false');
      } else {
        cb(null, bool === 'true');
      }
    });
  });
};

var inTopic = function inTopic(topic, cb) {
  if (topic === this.user.currentTopic) {
    cb(null, 'true');
  } else {
    cb(null, 'false');
  }
};

exports.default = {
  createUserFact: createUserFact,
  get: get,
  hasItem: hasItem,
  inTopic: inTopic,
  known: known,
  save: save
};