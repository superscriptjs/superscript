/*
  Math functions for
  - evaluating expressions
  - converting functions
  - sequence functions
*/

const math = require('../bot/math');
const roman = require('roman-numerals');
const debug = require('debug')('mathPlugin');

const evaluateExpression = function evaluateExpression(cb) {
  if (this.message.numericExp || (this.message.halfNumericExp && this.user.prevAns)) {
    const answer = math.parse(this.message.cwords, this.user.prevAns);
    let suggestedReply;
    if (answer) {
      this.user.prevAns = answer;
      console.log('Prev', this.user);
      suggestedReply = `I think it is ${answer}`;
    } else {
      suggestedReply = 'What do I look like, a computer?';
    }
    cb(null, suggestedReply);
  } else {
    cb(true, '');
  }
};

const numToRoman = function numToRoman(cb) {
  const suggest = `I think it is ${roman.toRoman(this.message.numbers[0])}`;
  cb(null, suggest);
};

const numToHex = function numToHex(cb) {
  const suggest = `I think it is ${parseInt(this.message.numbers[0], 10).toString(16)}`;
  cb(null, suggest);
};

const numToBinary = function numToBinary(cb) {
  const suggest = `I think it is ${parseInt(this.message.numbers[0], 10).toString(2)}`;
  cb(null, suggest);
};

const numMissing = function numMissing(cb) {
  // What number are missing 1, 3, 5, 7
  if (this.message.lemWords.indexOf('missing') !== -1 && this.message.numbers.length !== 0) {
    const numArray = this.message.numbers.sort();
    const mia = [];
    for (let i = 1; i < numArray.length; i++) {
      if (numArray[i] - numArray[i - 1] !== 1) {
        const x = numArray[i] - numArray[i - 1];
        let j = 1;
        while (j < x) {
          mia.push(parseFloat(numArray[i - 1]) + j);
          j += 1;
        }
      }
    }
    const s = mia.sort((a, b) => (a - b));
    cb(null, `I think it is ${s.join(' ')}`);
  } else {
    cb(true, '');
  }
};

// Sequence
const numSequence = function numSequence(cb) {
  if (this.message.lemWords.indexOf('sequence') !== -1 && this.message.numbers.length !== 0) {
    debug('Finding the next number in the series');
    let numArray = this.message.numbers.map(item => parseInt(item));
    numArray = numArray.sort((a, b) => (a - b));

    let suggest;
    if (math.arithGeo(numArray) === 'Arithmetic') {
      let x;
      for (let i = 1; i < numArray.length; i++) {
        x = numArray[i] - numArray[i - 1];
      }
      suggest = `I think it is ${parseInt(numArray.pop()) + x}`;
    } else if (math.arithGeo(numArray) === 'Geometric') {
      const a = numArray[1];
      const r = a / numArray[0];
      suggest = `I think it is ${numArray.pop() * r}`;
    }

    cb(null, suggest);
  } else {
    cb(true, '');
  }
};

export default {
  evaluateExpression,
  numMissing,
  numSequence,
  numToBinary,
  numToHex,
  numToRoman,
};
