'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint no-eval:0 */
// TODO - Make this into its own project

var debug = (0, _debug2.default)('math');

var cardinalNumberPlural = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eigth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
  thirteenth: 13,
  fourteenth: 14,
  fifteenth: 15,
  sixteenth: 16,
  seventeenth: 17,
  eighteenth: 18,
  nineteenth: 19,
  twentieth: 20,
  'twenty-first': 21,
  'twenty-second': 22,
  'twenty-third': 23,
  'twenty-fourth': 24,
  'twenty-fifth': 25,
  'twenty-sixth': 26
};

var cardinalNumbers = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90
};

var multiplesOfTen = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90
};

var mathExpressionSubs = {
  plus: '+',
  minus: '-',
  multiply: '*',
  multiplied: '*',
  x: '*',
  times: '*',
  divide: '/',
  divided: '/'
};

var mathTerms = ['add', 'plus', 'and', '+', '-', 'minus', 'subtract', 'x', 'times', 'multiply', 'multiplied', 'of', 'divide', 'divided', '/', 'half', 'percent', '%'];

var isNumeric = function isNumeric(num) {
  return !isNaN(num);
};

// Given an array for words it returns the evauated sum.
// TODO - fractions
// TODO, words should be the dict object with lem words to fix muliply / multipled etc
var parse = function parse(words) {
  var prev = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

  debug('In parse with ', words);
  var expression = [];
  var newexpression = [];
  var i = void 0;
  var word = void 0;

  for (i = 0; i < words.length; i++) {
    var digit = convertWordToNumber(words[i]);
    if (digit !== undefined) {
      words[i] = digit;
    }

    word = words[i];
    if (mathExpressionSubs[word] !== undefined) {
      words[i] = mathExpressionSubs[word];
    }
  }

  for (i = 0; i < words.length; i++) {
    word = words[i];
    if (/[\d\*\+\-\/=%]|of|half|percent/.test(word)) {
      if (word === 'half') {
        newexpression.push(0.5);
      } else if (word === 'of') {
        expression.push('*');
      } else if ((word === '%' || word === 'percent') && isNumeric(words[i - 1])) {
        expression.pop();
        expression.push(parseInt(words[i - 1]) / 100);
      } else {
        expression.push(word);
      }
    }
  }

  for (i = 0; i < expression.length; i++) {
    var curr = expression[i];
    var next = expression[i + 1];
    newexpression.push(curr);
    if (/\d/.test(curr) && /\d/.test(next)) {
      newexpression.push('+');
    }
  }

  try {
    // reintruduce
    if (newexpression.length === 2 || newexpression[0] === '+') {
      newexpression.unshift(prev);
    }
    debug('Eval', newexpression.join(' '));
    var value = eval(newexpression.join(' '));
    return +value.toFixed(2);
  } catch (e) {
    debug('Error', e);
    return null;
  }
};

// Given an array of words, lets convert them to numbers
// We want to subsitute one - one thousand to numberic form
// TODO handle "two-hundred" hypenated hundred/thousand
var convertWordsToNumbers = function convertWordsToNumbers(wordArray) {
  var mult = { hundred: 100, thousand: 1000 };
  var results = [];
  var i = void 0;

  for (i = 0; i < wordArray.length; i++) {
    // Some words need lookahead / lookbehind like hundred, thousand
    if (['hundred', 'thousand'].indexOf(wordArray[i]) >= 0) {
      results.push(String(parseInt(results.pop()) * mult[wordArray[i]]));
    } else {
      results.push(convertWordToNumber(wordArray[i]));
    }
  }

  // Second Pass add 'and's together
  for (i = 0; i < results.length; i++) {
    if (isNumeric(results[i]) && results[i + 1] === 'and' && isNumeric(results[i + 2])) {
      var val = parseInt(results[i]) + parseInt(results[i + 2]);
      results.splice(i, 3, String(val));
      i--;
    }
  }
  return results;
};

var convertWordToNumber = function convertWordToNumber(word) {
  var number = void 0;
  var multipleOfTen = void 0;
  var cardinalNumber = void 0;

  if (word !== undefined) {
    if (word.indexOf('-') === -1) {
      if (_lodash2.default.includes(Object.keys(cardinalNumbers), word)) {
        number = String(cardinalNumbers[word]);
      } else {
        number = word;
      }
    } else {
      multipleOfTen = word.split('-')[0]; // e.g. "seventy"
      cardinalNumber = word.split('-')[1]; // e.g. "six"
      if (multipleOfTen !== '' && cardinalNumber !== '') {
        var n = multiplesOfTen[multipleOfTen] + cardinalNumbers[cardinalNumber];
        if (isNaN(n)) {
          number = word;
        } else {
          number = String(n);
        }
      } else {
        number = word;
      }
    }
    return number;
  } else {
    return word;
  }
};

var numberLookup = function numberLookup(number) {
  var multipleOfTen = void 0;
  var word = '';

  if (number < 20) {
    for (var cardinalNumber in cardinalNumbers) {
      if (number === cardinalNumbers[cardinalNumber]) {
        word = cardinalNumber;
        break;
      }
    }
  } else if (number < 100) {
    if (number % 10 === 0) {
      // If the number is a multiple of ten
      for (multipleOfTen in multiplesOfTen) {
        if (number === multiplesOfTen[multipleOfTen]) {
          word = multipleOfTen;
          break;
        }
      }
    } else {
      // not a multiple of ten
      for (multipleOfTen in multiplesOfTen) {
        for (var i = 9; i > 0; i--) {
          if (number === multiplesOfTen[multipleOfTen] + i) {
            word = multipleOfTen + '-' + convertNumberToWord(i);
            break;
          }
        }
      }
    }
  } else {
    // TODO -
    console.log("We don't handle numbers greater than 99 yet.");
  }

  return word;
};

var convertNumberToWord = function convertNumberToWord(number) {
  if (number === 0) {
    return 'zero';
  }

  if (number < 0) {
    return 'negative ' + numberLookup(Math.abs(number));
  }

  return numberLookup(number);
};

var cardPlural = function cardPlural(wordNumber) {
  return cardinalNumberPlural[wordNumber];
};

var arithGeo = function arithGeo(arr) {
  var ap = void 0;
  var gp = void 0;

  for (var i = 0; i < arr.length - 2; i++) {
    if (!(ap = arr[i + 1] - arr[i] === arr[i + 2] - arr[i + 1])) {
      break;
    }
  }

  if (ap) {
    return 'Arithmetic';
  }

  for (var _i = 0; _i < arr.length - 2; _i++) {
    if (!(gp = arr[_i + 1] / arr[_i] === arr[_i + 2] / arr[_i + 1])) {
      break;
    }
  }

  if (gp) {
    return 'Geometric';
  }
  return -1;
};

exports.default = {
  arithGeo: arithGeo,
  cardPlural: cardPlural,
  convertWordToNumber: convertWordToNumber,
  convertWordsToNumbers: convertWordsToNumbers,
  mathTerms: mathTerms,
  parse: parse
};