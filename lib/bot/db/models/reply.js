'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _mongoTenant = require('mongo-tenant');

var _mongoTenant2 = _interopRequireDefault(_mongoTenant);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _modelNames = require('../modelNames');

var _modelNames2 = _interopRequireDefault(_modelNames);

var _utils = require('../../utils');

var _utils2 = _interopRequireDefault(_utils);

var _sort = require('../sort');

var _sort2 = _interopRequireDefault(_sort);

var _helpers = require('../helpers');

var _helpers2 = _interopRequireDefault(_helpers);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var createReplyModel = function createReplyModel(db) {
  var replySchema = new _mongoose2.default.Schema({
    id: { type: String, index: true, default: _utils2.default.genId() },
    reply: { type: String, required: '{reply} is required.' },
    keep: { type: Boolean, default: false },
    filter: { type: String, default: '' },
    parent: { type: String, ref: _modelNames2.default.gambit },

    // Replies could referece other gambits
    // This forms the basis for the 'previous' - These are Children
    gambits: [{ type: String, ref: _modelNames2.default.gambit }]
  });

  // This method is similar to the topic.findMatch
  replySchema.methods.findMatch = function findMatch(message, options, callback) {
    _helpers2.default.findMatchingGambitsForMessage(db, this.getTenantId(), 'reply', this._id, message, options, callback);
  };

  replySchema.methods.sortGambits = function sortGambits(callback) {
    var _this = this;

    var self = this;
    var expandReorder = function expandReorder(gambitId, cb) {
      db.model(_modelNames2.default.gambit).byTenant(_this.getTenantId()).findById(gambitId, function (err, gambit) {
        cb(err, gambit);
      });
    };

    _async2.default.map(this.gambits, expandReorder, function (err, newGambitList) {
      if (err) {
        console.log(err);
      }

      var newList = _sort2.default.sortTriggerSet(newGambitList);
      self.gambits = newList.map(function (g) {
        return g._id;
      });
      self.save(callback);
    });
  };

  replySchema.plugin(_mongoTenant2.default);

  return db.model(_modelNames2.default.reply, replySchema);
};

exports.default = createReplyModel;