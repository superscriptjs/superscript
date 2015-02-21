var Utils   = require("../utils");
var wordnet = require("../wordnet");
var replace = require("async-replace");
var _       = require("underscore");
var debug   = require("debug")("RegexReply");
var dWarn   = require("debug")("RegexReply:Warning");

// Prepares a trigger for the regular expression engine.

var emoList = ['~yes','~no','~emosad','~emohappy','~emosurprise','~emogoodbye','~emolaugh','~emothanks','~emogoodbye','~emobored','~emomisunderstand','~emomutual','~emopain','~emoskeptic','~emoignorance','~emodisgust','~emoprotest','~emoapology','~emomaybe','~emohello','~emohowzit'];


var processAlternates = function(reply) {
  // input Alternates.
  var match  = reply.match(/\((.+?)\)/g);

  if (match) {
    for(var i = 0; i < match.length;i++) {
      var altGroup = match[i];
      var altMatch  = altGroup.match(/\((.+?)\)/);
      var matchString = altMatch[0];
      var altStr = altMatch[1];
      var parts = altStr.split("|");
      
      var opts  = [];
      for (var n = 0; n < parts.length; n++) {
        opts.push(parts[n].trim());
      }

      opts = "(\\b" + opts.join("\\b|\\b") + "\\b)\\s?";
      reply = reply.replace(altGroup, opts);
    }    
  }
  
  return reply;
}

exports.parse = function (regexp, facts, callback) {
  regexp = processAlternates(regexp);

  // If the trigger is simply '*' then the * needs to become (.*?)
  // to match the blank string too.
  regexp = regexp.replace(/^\*$/, "<zerowidthstar>");

  // Simple replacements.
  // This replacement must be done before the next or they will conflict.
  // * replacement is now optional by default meaning 0,n
  // Match Single * allowing *~n and *n to pass though
  // regexp = regexp.replace(/\*(?!~?\d)/g, "(.+?)");  // Convert * into (.+?)
  regexp = regexp.replace(/\s?\*(?!~?\d)\s?/g, "(?:.*\\s?)");  // Convert * into (.*)

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
  regexp = regexp.replace(/<zerowidthstar>/g, "(?:.*?)");

  // Handle WordNet
  function wordnetReplace(match, sym, word, p3, offset, done) {
    // Use FactSystem first.

    facts.conceptToList(word.toLowerCase(), function(err, words){
      if (!_.isEmpty(words)) {
        words = "(\\b" + words.join("\\b|\\b") + "\\b)";
        // words = "(" + words.join("|") + ")";
        debug("Fact Replies", words)
        done(null, words);

      } else {
        wordnet.lookup(word, sym, function(err, words){
          // TODO add a space around the terms
          words = words.map(function(item) {return item.replace(/_/g, " ")})
          if (_.isEmpty(words)) {
            dWarn("Creating a trigger with a word NOT EXPANDED", match);
            done(null, match)            
          } else {
    
            words = "(\\b" + words.join("\\b|\\b") + "\\b)";
            debug("Wordnet Replies", words);
            done(null, words);
          }
        });
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
        return "(\\S+(:?\\s+\\S+){"+(parseInt(p1) - 1)+"})"
        // return "((?:[\\w]*\\s?){"+parseInt(p1)+"})"
      }
      regexp = regexp.replace(/<(\d+)ewidthstar>/g, exactWidthReplace);

      // nvWidthStar
      function varWidthReplace(match, p1, offset, string){
        return "(\\s?(?:[\\w-]*\\s?){0,"+parseInt(p1)+"})"
      }
      regexp = regexp.replace(/<(\d+)vwidthstar>/g, varWidthReplace);
      callback(regexp);
  });
};

// This function can be done after the first and contains the 
// user object so it may be contextual to this user.
exports.postParse = function(regexp, message, user, callback) {
  
  if (_.isNull(regexp)) {
    callback(null);
  } else {
    if (regexp.indexOf("<name") > -1 && message.names.length != 0) {
      // TODO - Scan ahead to detect the highest
      for (var i = 0 ; i < message.names.length; i++) {
        regexp = regexp.replace(new RegExp("<name"+(i+1)+">","g"), "(" + message.names[i] +")") ;
      }
      regexp = regexp.replace(new RegExp("<name>","g"), "(" + message.names[0] +")") ;
      regexp = regexp.replace(new RegExp("<names>","g"), "(" + message.names.join("|") + ")");
    } 

    if (regexp.indexOf("<noun") > -1 && message.nouns.length != 0) {
      for (var i = 0 ; i < message.nouns.length; i++) {
        regexp = regexp.replace(new RegExp("<noun"+(i+1)+">","g"), "(" + message.nouns[i] +")") ;
      }
      regexp = regexp.replace(new RegExp("<noun>","g"), "(" + message.nouns[0] +")") ;
      regexp = regexp.replace(new RegExp("<nouns>","g"), "(" + message.nouns.join("|") + ")");
    }

    if (regexp.indexOf("<adverb") > -1 && message.adverbs.length != 0) {
      for (var i = 0 ; i < message.adverbs.length; i++) {
        regexp = regexp.replace(new RegExp("<adverb"+(i+1)+">","g"), "(" + message.adverbs[i] +")") ;
      }
      regexp = regexp.replace(new RegExp("<adverb>","g"), "(" + message.adverbs[0] +")") ;
      regexp = regexp.replace(new RegExp("<adverbs>","g"), "(" + message.adverbs.join("|") + ")");
    } 

    if (regexp.indexOf("<verb") > -1 && message.verbs.length != 0) {
      for (var i = 0 ; i < message.verbs.length; i++) {
        regexp = regexp.replace(new RegExp("<verb"+(i+1)+">","g"), "(" + message.verbs[i] +")") ;
      }
      regexp = regexp.replace(new RegExp("<verb>","g"), "(" + message.verbs[0] +")") ;
      regexp = regexp.replace(new RegExp("<verbs>","g"), "(" + message.verbs.join("|") + ")");
    } 

    if (regexp.indexOf("<pronoun") > -1 && message.pronouns.length != 0) {
      for (var i = 0 ; i < message.pronouns.length; i++) {
        regexp = regexp.replace(new RegExp("<pronoun"+(i+1)+">","g"), "(" + message.pronouns[i] +")") ;
      }
      regexp = regexp.replace(new RegExp("<pronoun>","g"), "(" + message.pronouns[0] +")") ;
      regexp = regexp.replace(new RegExp("<pronouns>","g"), "(" + message.pronouns.join("|") + ")");
    }

    if (regexp.indexOf("<adjective") > -1 && message.adjectives.length != 0) {
      for (var i = 0 ; i < message.adjectives.length; i++) {
        regexp = regexp.replace(new RegExp("<adjective"+(i+1)+">","g"), "(" + message.adjectives[i] +")") ;
      }
      regexp = regexp.replace(new RegExp("<adjective>","g"), "(" + message.adjectives[0] +")") ;
      regexp = regexp.replace(new RegExp("<adjectives>","g"), "(" + message.adjectives.join("|") + ")");
    }

    if (regexp.indexOf("<input") > -1 || regexp.indexOf("<reply") > -1) {
      // Filter in <input> and <reply> tags.
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
  }
  
  callback(regexp);
}