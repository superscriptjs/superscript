import moment from 'moment';

const COEFF = 1000 * 60 * 5;

const getSeason = function getSeason() {
  const now = moment();
  now.dayOfYear();
  const doy = now.dayOfYear();

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
  cb(null, moment().format('dddd'));
};

exports.getDate = function getDate(cb) {
  cb(null, moment().format('ddd, MMMM Do'));
};

exports.getDateTomorrow = function getDateTomorrow(cb) {
  const date = moment().add(1,'d').format('ddd, MMMM Do');
  cb(null, date);
};

exports.getSeason = function getSeason(cb) {
  cb(null, getSeason());
};

exports.getTime = function getTime(cb) {
  const date = new Date();
  const rounded = new Date(Math.round(date.getTime() / COEFF) * COEFF);
  const time = moment(rounded).format('h:mm');
  cb(null, `The time is ${time}`);
};

exports.getGreetingTimeOfDay = function getGreetingTimeOfDay(cb) {
  const date = new Date();
  const rounded = new Date(Math.round(date.getTime() / COEFF) * COEFF);
  const time = moment(rounded).format('H');
  let tod;
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
  const date = new Date();
  const rounded = new Date(Math.round(date.getTime() / COEFF) * COEFF);
  const time = moment(rounded).format('H');
  let tod;
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
  cb(null, moment().format('dddd'));
};

exports.getMonth = function getMonth(cb) {
  let reply = '';
  if (this.message.words.indexOf('next') !== -1) {
    reply = moment().add(1,'M').format('MMMM');
  } else if (this.message.words.indexOf('previous') !== -1) {
    reply = moment().subtract(1,'M').format('MMMM');
  } else if (this.message.words.indexOf('first') !== -1) {
    reply = 'January';
  } else if (this.message.words.indexOf('last') !== -1) {
    reply = 'December';
  } else {
    reply = moment().format('MMMM');
  }
  cb(null, reply);
};
