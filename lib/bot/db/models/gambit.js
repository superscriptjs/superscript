'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _mongooseFindorcreate = require('mongoose-findorcreate');

var _mongooseFindorcreate2 = _interopRequireDefault(_mongooseFindorcreate);

var _mongoTenant = require('mongo-tenant');

var _mongoTenant2 = _interopRequireDefault(_mongoTenant);

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _ssParser = require('ss-parser');

var _ssParser2 = _interopRequireDefault(_ssParser);

var _modelNames = require('../modelNames');

var _modelNames2 = _interopRequireDefault(_modelNames);

var _helpers = require('../helpers');

var _helpers2 = _interopRequireDefault(_helpers);

var _utils = require('../../utils');

var _utils2 = _interopRequireDefault(_utils);

var _factSystem = require('../../factSystem');

var _factSystem2 = _interopRequireDefault(_factSystem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
  A Gambit is a Trigger + Reply or Reply Set
  - We define a Reply as a subDocument in Mongo.
**/

var debug = (0, _debugLevels2.default)('SS:Gambit');

/**
  A trigger is the matching rule behind a piece of input. It lives in a topic or several topics.
  A trigger also contains one or more replies.
**/

var createGambitModel = function createGambitModel(db) {
  var gambitSchema = new _mongoose2.default.Schema({
    id: { type: String, index: true, default: _utils2.default.genId() },

    // This is the input string that generates a rule,
    // In the event we want to export this, we will use this value.
    // Make this filed conditionally required if trigger is supplied
    input: { type: String },

    // The Trigger is a partly baked regex.
    trigger: { type: String, index: true },

    // If the trigger is a Question Match
    isQuestion: { type: Boolean, default: false },

    // If this gambit is nested inside a conditional block
    conditions: [{ type: String, default: '' }],

    // If the trigger is a Answer Type Match
    qType: { type: String, default: '' },
    qSubType: { type: String, default: '' },

    // The filter function for the the expression
    filter: { type: String, default: '' },

    // An array of replies.
    replies: [{ type: String, ref: _modelNames2.default.reply }],

    // Save a reference to the parent Reply, so we can walk back up the tree
    parent: { type: String, ref: _modelNames2.default.reply },

    // This will redirect anything that matches elsewhere.
    // If you want to have a conditional rediect use reply redirects
    // TODO, change the type to a ID and reference another gambit directly
    // this will save us a lookup down the road (and improve performace.)
    redirect: { type: String, default: '' }
  });

  gambitSchema.pre('save', function (next) {
    var _this = this;

    // FIXME: This only works when the replies are populated which is not always the case.
    // this.replies = _.uniq(this.replies, (item, key, id) => {
    //   return item.id;
    // });

    // If we created the trigger in an external editor, normalize the trigger before saving it.
    if (this.input && !this.trigger) {
      var facts = _factSystem2.default.createFactSystemForTenant(this.getTenantId());
      return _ssParser2.default.normalizeTrigger(this.input, facts, function (err, cleanTrigger) {
        _this.trigger = cleanTrigger;
        next();
      });
    }
    next();
  });

  gambitSchema.methods.addReply = function (replyData, callback) {
    var _this2 = this;

    if (!replyData) {
      return callback('No data');
    }

    var Reply = db.model(_modelNames2.default.reply).byTenant(this.getTenantId());
    var reply = new Reply(replyData);
    reply.save(function (err) {
      if (err) {
        return callback(err);
      }
      _this2.replies.addToSet(reply._id);
      _this2.save(function (err) {
        callback(err, reply);
      });
    });
  };

  gambitSchema.methods.doesMatch = function (message, options, callback) {
    _helpers2.default.doesMatch(this, message, options, callback);
  };

  gambitSchema.methods.clearReplies = function (callback) {
    var self = this;

    var clearReply = function clearReply(replyId, cb) {
      self.replies.pull({ _id: replyId });
      db.model(_modelNames2.default.reply).byTenant(this.getTenantId()).remove({ _id: replyId }, function (err) {
        if (err) {
          console.log(err);
        }

        debug.verbose('removed reply %s', replyId);

        cb(null, replyId);
      });
    };

    _async2.default.map(self.replies, clearReply, function (err, clearedReplies) {
      self.save(function (err2) {
        callback(err2, clearedReplies);
      });
    });
  };

  gambitSchema.methods.getRootTopic = function (cb) {
    var _this3 = this;

    if (!this.parent) {
      db.model(_modelNames2.default.topic).byTenant(this.getTenantId()).findOne({ gambits: { $in: [this._id] } }).exec(function (err, doc) {
        cb(err, doc.name);
      });
    } else {
      _helpers2.default.walkGambitParent(db, this.getTenantId(), this._id, function (err, gambits) {
        if (gambits.length !== 0) {
          db.model(_modelNames2.default.topic).byTenant(_this3.getTenantId()).findOne({ gambits: { $in: [gambits.pop()] } }).exec(function (err, topic) {
            cb(null, topic.name);
          });
        } else {
          cb(null, 'random');
        }
      });
    }
  };

  gambitSchema.plugin(_mongooseFindorcreate2.default);
  gambitSchema.plugin(_mongoTenant2.default);

  return db.model('ss_gambit', gambitSchema);
};

exports.default = createGambitModel;