'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

var _common = require('./common');

var _common2 = _interopRequireDefault(_common);

var _getReply = require('../getReply');

var _getReply2 = _interopRequireDefault(_getReply);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debugLevels2.default)('SS:Reply:Respond');

var respond = function respond(topicName, options, callback) {
  debug.verbose('Responding to topic: ' + topicName);

  _common2.default.getTopic(options.system.chatSystem, topicName, function (err, topicData) {
    if (err) {
      console.error(err);
    }

    options.pendingTopics = [topicData];

    (0, _getReply2.default)(options.message, options, function (err, respondReply) {
      if (err) {
        console.error(err);
      }

      debug.verbose('Callback from respond getReply: ', respondReply);

      if (respondReply) {
        return callback(err, respondReply);
      }
      return callback(err, {});
    });
  });
};

exports.default = respond;