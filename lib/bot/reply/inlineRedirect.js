'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

var _message = require('../message');

var _message2 = _interopRequireDefault(_message);

var _common = require('./common');

var _common2 = _interopRequireDefault(_common);

var _getReply = require('../getReply');

var _getReply2 = _interopRequireDefault(_getReply);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debugLevels2.default)('SS:Reply:inline');

var inlineRedirect = function inlineRedirect(triggerTarget, options, callback) {
  debug.verbose('Inline redirection to: \'' + triggerTarget + '\'');

  // if we have a special topic, reset it to the previous one
  // in order to preserve the context for inline redirection
  if (options.topic === '__pre__' || options.topic === '__post__') {
    if (options.user.history.topic.length) {
      options.topic = options.user.history.topic[0];
    }
  }

  _common2.default.getTopic(options.system.chatSystem, options.topic, function (err, topicData) {
    var messageOptions = {
      factSystem: options.system.factSystem
    };

    _message2.default.createMessage(triggerTarget, messageOptions, function (redirectMessage) {
      options.pendingTopics = [topicData];

      (0, _getReply2.default)(redirectMessage, options, function (err, redirectReply) {
        if (err) {
          console.error(err);
        }

        debug.verbose('Response from inlineRedirect: ', redirectReply);
        if (redirectReply) {
          return callback(null, redirectReply);
        }
        return callback(null, {});
      });
    });
  });
};

exports.default = inlineRedirect;