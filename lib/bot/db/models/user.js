'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

var _mongooseFindorcreate = require('mongoose-findorcreate');

var _mongooseFindorcreate2 = _interopRequireDefault(_mongooseFindorcreate);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _mongoTenant = require('mongo-tenant');

var _mongoTenant2 = _interopRequireDefault(_mongoTenant);

var _modelNames = require('../modelNames');

var _modelNames2 = _interopRequireDefault(_modelNames);

var _factSystem = require('../../factSystem');

var _factSystem2 = _interopRequireDefault(_factSystem);

var _logger = require('../../logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debugLevels2.default)('SS:User');

var createUserModel = function createUserModel(db) {
  var userSchema = _mongoose2.default.Schema({
    id: String,
    status: Number,
    currentTopic: String,
    pendingTopic: String,
    lastMessageSentAt: Date,
    volley: Number,
    rally: Number,
    prevAns: Number,
    conversation: Number,
    conversationState: Object,
    history: {
      input: [],
      reply: [],
      topic: [],
      stars: []
    }
  });

  userSchema.pre('save', function (next) {
    debug.verbose('Pre-Save Hook');
    this.history.input = this.history.input.slice(0, 15);
    this.history.reply = this.history.reply.slice(0, 15);
    this.history.topic = this.history.topic.slice(0, 15);
    this.history.stars = this.history.stars.slice(0, 15);
    next();
  });

  userSchema.methods.clearConversationState = function (callback) {
    this.conversationState = {};
    this.save(callback);
  };

  userSchema.methods.setTopic = function (topic, callback) {
    if (topic !== '' || topic !== 'undefined') {
      debug.verbose('setTopic', topic);
      this.pendingTopic = topic;
      this.save(function () {
        debug.verbose('setTopic Complete');
        callback(null);
      });
    } else {
      debug.warn('Trying to set topic to someting invalid');
      callback(null);
    }
  };

  userSchema.methods.getTopic = function () {
    debug.verbose('getTopic', this.currentTopic);
    return this.currentTopic;
  };

  userSchema.methods.updateHistory = function (msg, reply, replyObj, cb) {
    var _this = this;

    if (!_lodash2.default.isNull(msg)) {
      this.lastMessageSentAt = new Date();
    }

    // New Log format.
    var log = {
      user_id: this.id,
      raw_input: msg.original,
      normalized_input: msg.clean,
      matched_gambit: replyObj.minMatchSet,
      final_output: reply.clean,
      timestamp: msg.createdAt
    };

    var cleanId = this.id.replace(/\W/g, '');
    _logger2.default.log(JSON.stringify(log) + '\r\n', cleanId + '_trans.txt');

    // Did we successfully volley?
    // In order to keep the conversation flowing we need to have rythum and this means we always
    // need to continue to engage.
    if (reply.isQuestion) {
      this.volley = 1;
      this.rally = this.rally + 1;
    } else {
      // We killed the rally
      this.volley = 0;
      this.rally = 0;
    }

    this.conversation = this.conversation + 1;

    debug.verbose('Updating History');
    msg.messageScope = null;

    var stars = replyObj.stars;

    // Don't serialize MongoDOWN to Mongo
    msg.factSystem = null;
    reply.factSystem = null;
    reply.replyIds = replyObj.replyIds;

    this.history.stars.unshift(stars);
    this.history.input.unshift(msg);
    this.history.reply.unshift(reply);
    this.history.topic.unshift(this.currentTopic);

    if (this.pendingTopic !== undefined && this.pendingTopic !== '') {
      (function () {
        var pendingTopic = _this.pendingTopic;
        _this.pendingTopic = null;

        db.model(_modelNames2.default.topic).byTenant(_this.getTenantId()).findOne({ name: pendingTopic }, function (err, topicData) {
          if (topicData && topicData.nostay === true) {
            _this.currentTopic = _this.history.topic[0];
          } else {
            _this.currentTopic = pendingTopic;
          }
          _this.save(function (err) {
            debug.verbose('Saved user');
            if (err) {
              console.error(err);
            }
            cb(err, log);
          });
        });
      })();
    } else {
      cb(null, log);
    }
  };

  userSchema.methods.getVar = function (key, cb) {
    debug.verbose('getVar', key);

    this.memory.db.get({ subject: key, predicate: this.id }, function (err, res) {
      if (res && res.length !== 0) {
        cb(err, res[0].object);
      } else {
        cb(err, null);
      }
    });
  };

  userSchema.methods.setVar = function (key, value, cb) {
    debug.verbose('setVar', key, value);
    var self = this;

    self.memory.db.get({ subject: key, predicate: self.id }, function (err, results) {
      if (err) {
        console.log(err);
      }

      if (!_lodash2.default.isEmpty(results)) {
        self.memory.db.del(results[0], function () {
          var opt = { subject: key, predicate: self.id, object: value };
          self.memory.db.put(opt, function () {
            cb();
          });
        });
      } else {
        var opt = { subject: key, predicate: self.id, object: value };
        self.memory.db.put(opt, function (err2) {
          if (err2) {
            console.log(err2);
          }

          cb();
        });
      }
    });
  };

  userSchema.plugin(_mongooseFindorcreate2.default);
  userSchema.plugin(_mongoTenant2.default);

  userSchema.virtual('memory').get(function () {
    return _factSystem2.default.createFactSystemForTenant(this.getTenantId()).createUserDB(this.id);
  });

  return db.model(_modelNames2.default.user, userSchema);
};

exports.default = createUserModel;