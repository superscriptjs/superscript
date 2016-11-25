'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debugLevels2.default)('SS:Reply:customFunction');

var customFunction = function customFunction(functionName, functionArgs, replyObj, options, callback) {
  var plugins = options.system.plugins;
  // Important to create a new scope object otherwise we could leak data
  var scope = _lodash2.default.merge({}, options.system.scope);
  scope.extraScope = options.system.extraScope;
  scope.message = options.message;
  scope.user = options.user;

  if (plugins[functionName]) {
    functionArgs.push(function (err, functionResponse, stopMatching) {
      var reply = '';
      var props = {};
      if (err) {
        console.error('Error in plugin function (' + functionName + '): ' + err);
        return callback(err);
      }

      if (_lodash2.default.isPlainObject(functionResponse)) {
        if (functionResponse.text) {
          reply = functionResponse.text;
          delete functionResponse.text;
        }

        if (functionResponse.reply) {
          reply = functionResponse.reply;
          delete functionResponse.reply;
        }

        // There may be data, so merge it with the reply object
        replyObj.props = _lodash2.default.merge(replyObj.props, functionResponse);
        if (stopMatching !== undefined) {
          replyObj.continueMatching = !stopMatching;
        }
      } else {
        reply = functionResponse || '';
        if (stopMatching !== undefined) {
          replyObj.continueMatching = !stopMatching;
        }
      }

      return callback(err, reply);
    });

    debug.verbose('Calling plugin function: ' + functionName);
    plugins[functionName].apply(scope, functionArgs);
  } else {
    // If a function is missing, we kill the line and return empty handed
    console.error('WARNING: Custom function (' + functionName + ') was not found. Your script may not behave as expected.');
    callback(true, '');
  }
};

exports.default = customFunction;