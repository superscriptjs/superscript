/*

  Math functions for 
  - evaluating expressions
  - converting functions
  - sequence functions
*/

var math = require("../lib/math"); 
var roman = require('roman-numerals');
var debug = require("debug")("mathPlugin");

exports.evaluateExpression = function(cb) {
  if (this.message.numericExp || (this.message.halfNumericExp && this.user.prevAns)) {
    var answer = math.parse(this.message.cwords, this.user.prevAns);
    if (answer) {
      this.user.prevAns = answer;
      console.log("Prev", this.user);
      var suggestedReply = "I think it is " + answer;
    } else {
      var suggestedReply =  "What do I look like, a computer?";
    }
    cb(null, suggestedReply);
  } else {
    cb(true, "");
  } 
}

exports.numToRoman = function(cb) {
  suggest = "I think it is " + roman.toRoman(this.message.numbers[0]);
  cb(null, suggest);
}

exports.numToHex = function(cb) {
  suggest = "I think it is " + parseInt(this.message.numbers[0], 10).toString(16);
  cb(null, suggest);
}

exports.numToBinary = function(cb) {
  var suggest = "I think it is " + parseInt(this.message.numbers[0], 10).toString(2);
  cb(null, suggest);
}

 
exports.numMissing = function(cb) {
  // What number are missing 1, 3, 5, 7
  if (this.message.lemWords.indexOf("missing") != -1 && this.message.numbers.length != 0) {
    var numArray = this.message.numbers.sort();
    var mia = [];
    for(var i = 1; i < numArray.length; i++) {
      if(numArray[i] - numArray[i-1] != 1) {
        var x = numArray[i] - numArray[i-1];
        var j = 1;
        while (j < x) {
          mia.push(parseFloat(numArray[i-1])+j);
          j++;
        }
      }
    }
    var s = mia.sort(function(a, b){return a-b});
    cb(null, "I think it is " + s.join(" "));
  } else {
    cb(true, "");
  }
}

// Sequence
exports.numSequence = function(cb) {
  if (this.message.lemWords.indexOf("sequence") != -1 && this.message.numbers.length != 0) {
    debug("Finding the next number in the series")
    var numArray = this.message.numbers.map(function(item){return parseInt(item)})
    numArray = numArray.sort(function(a, b){return a-b});
    
    if (math.arithGeo(numArray) == "Arithmetic") {
      for(var i = 1; i < numArray.length; i++) {
        var x = numArray[i] - numArray[i-1];
      }
      suggest = "I think it is " + (parseInt(numArray.pop()) + x);
    } else if (math.arithGeo(numArray) == "Geometric") {
      var a = numArray[1];
      var r = a / numArray[0];
      suggest = "I think it is " + numArray.pop() * r;
    }

    cb(null, suggest);
  } else {
    cb(true, "");
  }
}