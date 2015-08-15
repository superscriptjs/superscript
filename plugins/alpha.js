var rhyme = require('rhyme');
var syllabistic = require('syllablistic');
var debug = require("debug")("AlphaPlugins");
var _ = require("lodash");

var getRandomInt = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

exports.oppisite = function(word, cb) {

  debug("oppisite", word);
  
  this.facts.db.get({subject:word, predicate: "opposite"}, function(err, opp) {

    if (!_.isEmpty(opp)) {
      var oppisiteWord = opp[0].object;
      oppisiteWord = oppisiteWord.replace(/_/g, " ");
      cb(null, oppisiteWord);
    } else {
      cb(null, "");
    }

  });
};

// This uses rhyme and it is painfully slow
exports.rhymes = function(word, cb) {

  debug("rhyming", word);

  rhyme(function (r) {
    var rhymedWords = r.rhyme(word);
    var i = getRandomInt(0, rhymedWords.length - 1);

    if (rhymedWords.length !== 0) {
      cb(null, rhymedWords[i].toLowerCase());
    } else {
      cb(null, null);
    }
  });
};

exports.syllable = function(word, cb) {
  cb(null, syllabistic.text(word));
};

exports.letterLookup = function(cb) {
  
  var math = require("../lib/math");
  var reply = "";

  var lastWord = this.message.lemWords.slice(-1)[0];
  debug("--LastWord", lastWord);
  debug("LemWords", this.message.lemWords);
  var alpha = "abcdefghijklmonpqrstuvwxyz".split("");
  var pos = alpha.indexOf(lastWord);
  debug("POS", pos);
  if (this.message.lemWords.indexOf("before") != -1) {
    if (alpha[pos - 1]) {
      reply = alpha[pos - 1].toUpperCase();
    } else {
      reply = "Don't be silly, there is nothing before A";
    }
  } else if (this.message.lemWords.indexOf("after") != -1) {
    if (alpha[pos + 1]) {
      reply = alpha[pos + 1].toUpperCase();
    } else {
      reply = "haha, funny.";
    }
  } else {
    var i = this.message.lemWords.indexOf("letter");
    var loc = this.message.lemWords[i - 1];

    if (loc == "first") {
      reply = "It is A.";
    } else if (loc == "last") {
      reply = "It is Z.";
    } else {

      // Number or word number
      // 1st, 2nd, 3rd, 4th or less then 99
      if ((loc === "st"  || loc === "nd" || loc === "rd" || loc === "th") && this.message.numbers.length !== 0 ) {
        var num = parseInt(this.message.numbers[0]);
        if (num > 0 && num <= 26) {
          reply =  "It is " + alpha[num - 1].toUpperCase();
        } else {
          reply = "seriously...";
        }
      }
    }
  }
  cb(null, reply);
};

exports.wordLength = function(cap, cb) {
  if (typeof cap == "string") {
    var parts = cap.split(" ");
    if (parts.length == 1) {
      cb(null, cap.length);
    } else {
      if (parts[0].toLowerCase() == "the" && parts.length == 3) {
        // name bill, word bill
        cb(null, parts.pop().length);
      } else if (parts[0] == "the" && parts[1].toLowerCase() == "alphabet") {
        cb(null, "26");
      } else if (parts[0] == "my" && parts.length == 2) {
        // Varible lookup
        var lookup = parts[1];
        this.user.getVar(lookup, function(e,v){
          if (v !== null && v.length) {
            cb(null, "There are "+ v.length +" letters in your " + lookup + ".");
          } else {
            cb(null, "I don't know");
          }
        });
      } else if (parts[0] == "this" && parts.length == 2) {
        // this phrase, this sentence
        cb(null, "That phrase has " + this.message.raw.length + " characters. I think.");
      } else {
        cb(null, "I think there is about 10 characters. :)");
      }
    }
    
  } else {
    cap(null,"");
  }
};

exports.nextNumber = function(cb) {
  var reply = "";
  var num = this.message.numbers.slice(-1)[0];
  
  if (num) {
    if (this.message.lemWords.indexOf("before") !== -1) {
      reply = parseInt(num) - 1;
    }
    if (this.message.lemWords.indexOf("after") !== -1) {
      reply = parseInt(num) + 1;
    }
  }

  cb(null, reply);
};