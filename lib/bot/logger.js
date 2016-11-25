'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// The directory to write logs to
var logPath = void 0;

var setLogPath = function setLogPath(path) {
  if (path) {
    try {
      _mkdirp2.default.sync(path);
      logPath = path;
    } catch (e) {
      console.error('Could not create logs folder at ' + logPath + ': ' + e);
    }
  }
};

var log = function log(message) {
  var logName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'log';

  if (logPath) {
    var filePath = logPath + '/' + logName + '.log';
    try {
      _fs2.default.appendFileSync(filePath, message);
    } catch (e) {
      console.error('Could not write log to file with path: ' + filePath);
    }
  }
};

exports.default = {
  log: log,
  setLogPath: setLogPath
};