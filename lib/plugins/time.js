'use strict';

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var COEFF = 1000 * 60 * 5;

var getSeason = function getSeason() {
  var now = (0, _moment2.default)();
  now.dayOfYear();
  var doy = now.dayOfYear();

  if (doy > 80 && doy < 172) {
    return 'spring';
  } else if (doy > 172 && doy < 266) {
    return 'summer';
  } else if (doy > 266 && doy < 357) {
    return 'fall';
  } else if (doy < 80 || doy > 357) {
    return 'winter';
  }
  return 'unknown';
};

exports.getDOW = function getDOW(cb) {
  cb(null, (0, _moment2.default)().format('dddd'));
};

exports.getDate = function getDate(cb) {
  cb(null, (0, _moment2.default)().format('ddd, MMMM Do'));
};

exports.getDateTomorrow = function getDateTomorrow(cb) {
  var date = (0, _moment2.default)().add('d', 1).format('ddd, MMMM Do');
  cb(null, date);
};

exports.getSeason = function getSeason(cb) {
  cb(null, getSeason());
};

exports.getTime = function getTime(cb) {
  var date = new Date();
  var rounded = new Date(Math.round(date.getTime() / COEFF) * COEFF);
  var time = (0, _moment2.default)(rounded).format('h:mm');
  cb(null, 'The time is ' + time);
};

exports.getGreetingTimeOfDay = function getGreetingTimeOfDay(cb) {
  var date = new Date();
  var rounded = new Date(Math.round(date.getTime() / COEFF) * COEFF);
  var time = (0, _moment2.default)(rounded).format('H');
  var tod = void 0;
  if (time < 12) {
    tod = 'morning';
  } else if (time < 17) {
    tod = 'afternoon';
  } else {
    tod = 'evening';
  }

  cb(null, tod);
};

exports.getTimeOfDay = function getTimeOfDay(cb) {
  var date = new Date();
  var rounded = new Date(Math.round(date.getTime() / COEFF) * COEFF);
  var time = (0, _moment2.default)(rounded).format('H');
  var tod = void 0;
  if (time < 12) {
    tod = 'morning';
  } else if (time < 17) {
    tod = 'afternoon';
  } else {
    tod = 'night';
  }

  cb(null, tod);
};

exports.getDayOfWeek = function getDayOfWeek(cb) {
  cb(null, (0, _moment2.default)().format('dddd'));
};

exports.getMonth = function getMonth(cb) {
  var reply = '';
  if (this.message.words.indexOf('next') !== -1) {
    reply = (0, _moment2.default)().add('M', 1).format('MMMM');
  } else if (this.message.words.indexOf('previous') !== -1) {
    reply = (0, _moment2.default)().subtract('M', 1).format('MMMM');
  } else if (this.message.words.indexOf('first') !== -1) {
    reply = 'January';
  } else if (this.message.words.indexOf('last') !== -1) {
    reply = 'December';
  } else {
    reply = (0, _moment2.default)().format('MMMM');
  }
  cb(null, reply);
};