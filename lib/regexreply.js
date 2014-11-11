var Utils   = require("./utils");
var wordnet = require("./wordnet");
var replace = require("async-replace");
var _       = require("underscore");
var debug   = require("debug")("RegexReply");
var dWarn   = require("debug")("RegexReply:Warning");


// Prepares a trigger for the regular expression engine.
// TODO - Move this after parse, it should improve performace

var emoList = ['~yes','~no','~emosad','~emohappy','~emosurprise','~emogoodbye','~emolaugh','~emothanks','~emogoodbye','~emobored','~emomisunderstand','~emomutual','~emopain','~emoskeptic','~emoignorance','~emodisgust','~emoprotest','~emoapology','~emomaybe','~emohello','~emohowzit'];

exports.parse = function (regexp, callback) {

  // If the trigger is simply '*' then the * needs to become (.*?)
  // to match the blank string too.
  regexp = regexp.replace(/^\*$/, "<zerowidthstar>");

  // Simple replacements.
  // This replacement must be done before the next or they will conflict.
  // * replacement is now optional by default meaning 0,n
  // Match Single * allowing *~n and *n to pass though
  // regexp = regexp.replace(/\*(?!~?\d)/g, "(.+?)");  // Convert * into (.+?)
  regexp = regexp.replace(/\s?\*(?!~?\d)/g, "(?:.*)");  // Convert * into (.*)

  // Step 1 nWidthStar
  // (\s?(?:[\w]*\s?){n})
  // Here we match *n where n is the number of words to allow
  // This provides much more flexibility around matching adverbs with nouns.
  // We deliberately slurp in the trailing space to support zero or more words
  function replacer1(match, p1, offset, string){
    if (p1) debug("WIDTH STAR", p1, match);
    return "<"+parseInt(p1)+"ewidthstar>"
  }

  // Step 2 nWidthStar
  // (\s?(?:[\w]*\s?){0,n})
  function replacer2(match, p1, offset, string){
    if (p1) debug("WIDTH STAR", p1, match);
    var num = parseInt(p1.replace("~",""));
    return "<"+num+"vwidthstar>"
  }

  regexp = regexp.replace(/\*(\d)/g, replacer1);  // Convert *n into multi word EXACT match
  regexp = regexp.replace(/\*(~\d\s?)/g, replacer2);  // Convert *~n into multi word VARIABLE match
  // regexp = regexp.replace(/#/g,  "(\\d+?)"); // Convert # into (\d+?)
  // regexp = regexp.replace(/_/g,  "([A-Za-z]+?)"); // Convert _ into (\w+?)
  regexp = regexp.replace(/<zerowidthstar>/g, "(?:.*?)");

  // Handle WordNet
  function wordnetReplace(match, sym, word, p3, offset, done) {
    wordnet.lookup(word, sym, function(err, words){
      words = words.map(function(item) {return item.replace(/_/g, " ")})
      if (words.length == 0) {
        // This could be a emo reply
        if (_.contains(emoList, match)) {
          debug("EMO Reply")
          done(null, match)
        }
      } else {
        words = "(" + words.join("|") + ")";
        debug("Wordnet Replies", words)
        done(null, words)       
      }
    });
  }

  replace(regexp, /(~)(\w[\w]+)/g, wordnetReplace, function(err, result) {

    regexp = result;

      // Optionals.
      var match  = regexp.match(/\[(.+?)\]/);
      var giveup = 0;
      while (match) {
        giveup++;
        if (giveup >= 50) {
          dWarn("Infinite loop when trying to process optionals in trigger!");
          return "";
        }

        var parts = match[1].split("|");
        var opts  = [];
        for (var i = 0, iend = parts.length; i < iend; i++) {
          var p = "\\s*" + parts[i] + "\\s*";
          opts.push(p);
        }

        opts.push("\\s*");

        // If this optional had a star or anything in it, make it non-matching.
        var pipes = opts.join("|");
        pipes = pipes.replace(new RegExp(Utils.quotemeta("(.+?)"), "g"),        "(?:.+?)");
        pipes = pipes.replace(new RegExp(Utils.quotemeta("(\\d+?)"), "g"),      "(?:\\d+?)");
        pipes = pipes.replace(new RegExp(Utils.quotemeta("([A-Za-z]+?)"), "g"), "(?:[A-Za-z]+?)");

        regexp = regexp.replace(new RegExp("\\s*\\[" + Utils.quotemeta(match[1]) + "\\]\\s*"),
          "(?:" + pipes + ")");
        match  = regexp.match(/\[(.+?)\]/); // Circle of life!
      }

      
      // neWidthStar
      function exactWidthReplace(match, p1, offset, string){
        // (\S+(:?\s+\S+){2})
        return "(\\S+(:?\\s+\\S+){"+(parseInt(p1) - 1)+"})"
        return "((?:[\\w]*\\s?){"+parseInt(p1)+"})"
        // return "(\\s?(?:[\\w]*\\s?){"+parseInt(p1)+"})"
      }
      regexp = regexp.replace(/<(\d+)ewidthstar>/g, exactWidthReplace);

      // nvWidthStar
      function varWidthReplace(match, p1, offset, string){
        return "(\\s?(?:[\\w]*\\s?){0,"+parseInt(p1)+"})"
      }
      regexp = regexp.replace(/<(\d+)vwidthstar>/g, varWidthReplace);

      callback(regexp);
  });
};

// This function can be done after the first and contains the 
// user object so it may be contextual to this user.
exports.postParse = function(regexp, user, callback) {
  // Filter in <input> and <reply> tags.

  if (_.isNull(regexp)) {
    callback(null);
  } else if (regexp.indexOf("<input") > -1 || regexp.indexOf("<reply") > -1) {
    debug("Input, Reply Match Found")
    var types = ["input", "reply"];
    for (var i = 0; i < 2; i++) {
      var type = types[i];
      // Numbered Replies/Inputs 1 - 9
      for (var j = 1; j <= 9; j++) {
        if (regexp.indexOf("<" + type + j + ">") && user["__history__"][type][j]) {
          regexp = regexp.replace(new RegExp("<" + type + j + ">","g"), user["__history__"][type][j].raw);
        }
      }

      // Generic Reply/Input (first one)
      if (user["__history__"][type][0]) { 
        regexp = regexp.replace(new RegExp("<" + type + ">","g"), user["__history__"][type][0].raw);
      }
    }
  }

  callback(regexp);
}