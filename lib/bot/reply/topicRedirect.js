'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

var _common = require('./common');

var _common2 = _interopRequireDefault(_common);

var _message = require('../message');

var _message2 = _interopRequireDefault(_message);

var _getReply = require('../getReply');

var _getReply2 = _interopRequireDefault(_getReply);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debugLevels2.default)('SS:Reply:topicRedirect');

var topicRedirect = function topicRedirect(topicName, topicTrigger, options, callback) {
  debug.verbose('Topic redirection to topic: ' + topicName + ', trigger: ' + topicTrigger);

  // Here we are looking for gambits in the NEW topic.
  _common2.default.getTopic(options.system.chatSystem, topicName, function (err, topicData) {
    if (err) {
      console.error(err);
      return callback(null, {});
    }

    var messageOptions = {
      facts: options.system.factSystem
    };

    _message2.default.createMessage(topicTrigger, messageOptions, function (redirectMessage) {
      options.pendingTopics = [topicData];

      (0, _getReply2.default)(redirectMessage, options, function (err, redirectReply) {
        if (err) {
          console.error(err);
        }

        debug.verbose('redirectReply', redirectReply);
        if (redirectReply) {
          return callback(null, redirectReply);
        }
        return callback(null, {});
      });
    });
  });
};

exports.default = topicRedirect;