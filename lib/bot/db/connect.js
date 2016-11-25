'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (mongoURI) {
  var db = _mongoose2.default.createConnection('' + mongoURI);

  db.on('error', console.error);

  // If you want to debug mongoose
  // mongoose.set('debug', true);

  return db;
};