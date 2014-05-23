// TODO - Make this into its own project

var _ = require("underscore");
var debug = require("debug")("math");

var cardinalNumberPlural = {
  "first": 1,
  "second": 2,
  "third": 3,
  "fourth": 4,
  "fifth": 5,
  "sixth": 6,
  "seventh": 7,
  "eigth": 8,
  "ninth": 9,
  "tenth": 10,
  "eleventh": 11,
  "twelfth ": 12,
  "thirteenth": 13,
  "fourteenth" : 14,
  "fifteenth": 15,
  "sixteenth": 16,
  "seventeenth": 17,
  "eighteenth": 18,
  "nineteenth": 19,
  "twentieth": 20,
  "twenty-first": 21,
  "twenty-second": 22,
  "twenty-third": 23,
  "twenty-fourth": 24,
  "twenty-fifth": 25,
  "twenty-sixth": 26
}

var cardinalNumbers = {
  "one": 1,
  "two": 2,
  "three": 3,
  "four": 4,
  "five": 5,
  "six": 6,
  "seven": 7,
  "eight": 8,
  "nine": 9,
  "ten": 10,
  "eleven": 11,
  "twelve": 12,
  "thirteen": 13,
  "fourteen": 14,
  "fifteen": 15,
  "sixteen": 16,
  "seventeen": 17,
  "eighteen": 18,
  "nineteen": 19,
  "twenty": 20,
  "thirty": 30,
  "forty": 40,
  "fifty": 50,
  "sixty": 60,
  "seventy": 70,
  "eighty": 80,
  "ninety": 90
}

var multiplesOfTen = {
  "twenty": 20,
  "thirty": 30,
  "forty": 40,
  "fifty": 50,
  "sixty": 60,
  "seventy": 70,
  "eighty": 80,
  "ninety": 90
}

var mathExpressionSubs = {
  'plus': '+',
  'minus': '-',
  'multiply': '*',
  'x': '*',
  'times': '*',
  'divide': '/'
}

var mathTerms = exports.mathTerms = ["add", "plus", "+", "-", "minus", "times", "divide", "/", "subtract", "multiply", "half", "percent", "%"];

// Given an array for words it returns the evauated sum.
// TODO - fractions
exports.parse = function(words){
  debug("In parse with", words)
  var expression = [];
  var newexpression = [];

  for (var i = 0; i < words.length; i++) {
    var digit = convertWordToNumber(words[i]);
    if (digit != undefined) {
      words[i] = digit;
    }  

    var word = words[i];
    if (mathExpressionSubs[word] != undefined) {
      words[i] = mathExpressionSubs[word];
    }
  }

  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    if (/[\d\*\+\-\/=%]|of|half/.test(word)) {
      if (word == "half") {
       newexpression.push(.5);
      } else if (word == "of") {
        expression.push("*");        
      } else if (word == "%" && isNumeric(words[i - 1])) {
        expression.pop();
        expression.push(parseInt(words[i - 1]) / 100);
      } else {
        expression.push(word);
      }
    }
  }

  for (var i = 0; i < expression.length; i++) {
    var curr = expression[i];
    var next = expression[i + 1];
    newexpression.push(curr);
    if (/\d/.test(curr) && /\d/.test(next)) {
      newexpression.push("+");
    } 
  }

  try {
    debug("Eval", newexpression.join(" "))
    var value = eval(newexpression.join(" "));
    return +value.toFixed(2);
  } catch (e) {
    debug("Error", e);
    return null;  
  }
};

// Given an array of words, lets convert them to numbers
// We want to subsitute one - one thousand to numberic form
// TODO handle "two-hundred" hypenated hundred/thousand
exports.convertWordsToNumbers = function(wordArray) {

  var mult = {hundred: 100, thousand: 1000};
  var addBack = false;
  var results = [], i;
  for (i = 0; i < wordArray.length; i++) {
    // Some words need lookahead / lookbehind like hundred, thousand
    if (['hundred','thousand'].indexOf(wordArray[i]) >= 0) {
      results.push(String(parseInt(results.pop()) *  mult[wordArray[i]]))
    } else {
      results.push(convertWordToNumber(wordArray[i]));  
    }
  }

  var newResults = [];
  // Second Pass add 'and's together
  for (i = 0; i < results.length; i++) {
    if (isNumeric(results[i]) && results[i + 1] == "and" && isNumeric(results[i + 2])) {
      var val = parseInt(results[i]) + parseInt(results[i + 2]);
      results.splice(i, 3, String(val));
      i--;
    }
  }
  return results;
}

exports.convertWordToNumber = convertWordToNumber = function(word) {
	var number, multipleOfTen, cardinalNumber;
  if (word !== undefined) {
	  if (word.indexOf("-") === -1) {
      if (cardinalNumbers[word]) {
        number = String(cardinalNumbers[word]);
      } else {
        number = word;
      }
	  } else {
	    multipleOfTen = word.split("-")[0];   // e.g. "seventy"
	    cardinalNumber = word.split("-")[1];   // e.g. "six"
	    number = String(multiplesOfTen[multipleOfTen] + cardinalNumbers[cardinalNumber]); 
	  } 
	  return number;
	} else {
		return word;
	}
}


function numberLookup(number) {
  
	if (number < 20) {
    for (var cardinalNumber in cardinalNumbers) {
      if (number == cardinalNumbers[cardinalNumber]) {
        word = cardinalNumber;
        break;
      }
    }
  } else if (number < 100) {
    if (number % 10 == 0) { // If the number is a multiple of ten
      for (var multipleOfTen in multiplesOfTen) {
        if (number == multiplesOfTen[multipleOfTen]) {
          word = multipleOfTen;
          break;
        }
      }
    } else { // not a multiple of ten
      for (var multipleOfTen in multiplesOfTen) {
        for (var i = 9; i > 0; i--) {
          if (number == multiplesOfTen[multipleOfTen] + i) {
            word = multipleOfTen + "-" + convertNumberToWord(i);
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
}

function convertNumberToWord(number) {
  var word = new String(); // this is where we will store the result
  
  if (number == 0) { 
  	return "zero";
  }

  if (number < 0) { 
  	return "negative " + numberLookup(Math.abs(number));
  } else {
  	return numberLookup(number);
  }
}

exports.cardPlural = function(wordNumber) {
  return cardinalNumberPlural[wordNumber];
}

var isNumeric = function(num){
  return !isNaN(num)
}
