var pos     = require("pos");
var _       = require("underscore");
var natural = require("natural");
var math    = require("./math");
var ngrams  = natural.NGrams;
var tense   = require("node-tense");
var moment  = require("moment");
var Lemmer  = require('node-lemmer').Lemmer;
var Dict    = require("./dict");
var Utils   = require("./utils");

var debug   = require("debug")("Message");

// TODO, pull these in from node-tense
var verbTensesAliases = {
   "infinitive": "inf",
   "1st singular present": "1sgpres",
   "2nd singular present": "2sgpres",
   "3rd singular present": "3sgpres",
   "present plural": "pl",
   "present participle": "prog",
   "1st singular past": "1sgpast",
   "2nd singular past": "2sgpast",
   "3rd singular past": "3sgpast",
   "past": "past",
   "past plural": "pastpl",
   "past participle": "ppart" 
}

function Message(msg, qtypes, norm, cnet, facts, cb) {
  debug("Creating message from:", msg);

  if (!msg) {
    debug("Callback Early, empty msg")
    return cb({});
  }

  var that = this;
  that.createdAt = new Date();
  that.raw = msg;
  that.clean = norm.clean(msg).trim();

  var wordArray = new pos.Lexer().lex(that.clean);
  // This is where we keep the words
  that.dict = new Dict(wordArray);

  // TODO Phase out words, cwords
  that.words = wordArray;
  that.cwords = math.convertWordsToNumbers(wordArray);
  that.taggedWords = new pos.Tagger().tag(that.cwords);
  that.lemWords = that.lemma();

  var posArray = that.taggedWords.map(function(hash){ return hash[1]});
  var lemString = that.lemWords.join(" ");
  that.posString = posArray.join(" ");
  
  that.dict.add("num", that.cwords);
  that.dict.add("lemma", that.lemWords);
  that.dict.add("pos", posArray);

  // Classify Question
  that.qtype = qtypes.classify(lemString);
  that.qSubType = qtypes.questionType(lemString);
  that.isQuestion = qtypes.isQuestion(that.clean);

  // Sentence Sentiment
  that.sentiment = 0;

  // Get Nouns and Noun Phrases.
  that.nouns = this.fetchNouns();
  that.names = this.fetchComplexNouns("names");

  // Things are nouns + complex nouns so 
  // turkey and french fries would return ['turkey','french fries']
  // This should probably run the list though concepts or something else to validate them more
  // than NN NN etc.
  that.things = this.fetchComplexNouns("nouns");

  // A list of terms
  // This would return an array of thems that are a, b and c;
  // Helpful for choosing something when the qSubType is CH
  that.list = this.fetchList();

  that.adjectives = this.fetchAdjectives();
  that.adverbs = this.fetchAdverbs();
  that.verbs = this.fetchVerbs();
  that.pronouns = that.pnouns = this.fetchProNouns();
  that.compareWords = this.fetchCompareWords();
  that.numbers = this.fetchNumbers();
  that.compare = (that.compareWords.length != 0);

  // Second pass on names, using local concepts, just in case we missed anything
  for (var i = 0; i < that.nouns.length; i++) {
    if (_.contains(facts.query("direct_sv", that.nouns[i], "isa"), "names")) {
      var add = true;
      _.each(that.names, function(item){
        var it = item.toLowerCase();
        if (it.indexOf(that.nouns[i].toLowerCase()) != -1) {
          add = false;
        } 
      })
      if (add === true) {
        that.names.push(that.nouns[i]); 
      }
    }
  }
  that.names = _.uniq(that.names, function(name) {return name.toLowerCase()});

  // Nouns with Names removed.
  var t = that.names.map(function(i) { return i.toLowerCase() });
  that.cNouns = _.filter(that.nouns, function(item){
    return (!_.contains(t, item.toLowerCase()));
  });

  var _tense = [];

  var numCount = 0;
  var oppCount = 0;
  
  for (var i = 0; i < that.taggedWords.length; i++) {
    if (that.taggedWords[i][1] == 'CD') { 
      numCount++;
    }
    
    if (that.taggedWords[i][1] == 'SYM' || math.mathTerms.indexOf(that.lemWords[i]) !== -1) {
      // Half is a number and not an opp
      if (that.taggedWords[i][0] == "half") {
        numCount++;
      } else {
        oppCount++;
      }
    }
  }

  // http://rubular.com/r/SAw0nUqHJh
  var re = /([a-z]{3,10}\s+[\d]{1,2}\s?,?\s+[\d]{2,4}|[\d]{2}\/[\d]{2}\/[\d]{2,4})/i;
  that.date = null;
  if (m = that.clean.match(re)) {
    debug("Date", m);
    that.date = moment(Date.parse(m[0]));
  }

  if (that.qtype == "NUM:date" && that.date == null) {
    debug("Try to resolve Date");
    // TODO, in x months, x months ago, x months from now
    // TODO, in MMMM
    if (_.contains(that.nouns, "month")) {
      if (that.dict.contains("next")) {
        that.date = moment().add('M', 1);
      }
      if (that.dict.contains("last")) {
        that.date = moment().subtract('M', 1);
      }
    } else {
      debug("--- Resolve TODOs to make this date work!");
    }
  }

  that.numericExp = (numCount >= 2 && oppCount >= 1) ? true : false;
  that.halfNumericExp = (numCount == 1 && oppCount == 1) ? true : false;

  facts.highLevelLookup(wordArray.join(" "), function(err, hlc) {
    debug("Adding HLC", hlc);
    
    // Okay here we swap out the nouns with high level concepts.
    var extra = that.dict.addHLC(hlc);
    if (!_.isEmpty(extra)) {
      for (var n = 0; n < extra.length; n++) {
        for (var i = 0; i < that.list.length; i++) {
          if (extra[n].indexOf(that.list[i]) > -1) {
            that.list[i] = extra[n];
          }
        }
      }
    }

    var conceptList = hlc.map(function(list){ return list.hlc; });
    var hlc = _.unique(_.flatten(conceptList));

    that.findSentiment(hlc);

    cnet.conceptLookup(that.lemWords.join(" "), function(err, cnetReply){
      that.concepts = cnetReply;
      
      tense(function(v){

        for (var i = 0; i < that.verbs.length; i++) {
          var x = v.tense(that.verbs[i]);
          _tense.push(verbTensesAliases[x]);
        }

        if (_tense.length == 1) {
          that.tense = _tense[0];
        } else {
          debug("More then one tense", _tense)
          // TODO figure out how to handle this :)
        }

        debug("Message", that)
        cb(that);
      });
    });
  });
}

Message.prototype.toLog = function(prefix) {
  return this.createdAt + " (" + prefix + ") " + this.raw + " \r\n";
}

Message.prototype.findSentiment = function(hlc) {
  for (var i = 0; i < hlc.length; i++) {
    if (_.contains(hlc[i].hlc, "weakbadness")) {
      that.sentiment += -1;
    }
    if (_.contains(hlc[i].hlc, "badness")) {
      that.sentiment += -2;
    }
    if (_.contains(hlc[i].hlc, "strongbadness")) {
      that.sentiment += -3;
    }
    if (_.contains(hlc[i].hlc, "weakgoodness")) {
      that.sentiment += 1;
    }
    if (_.contains(hlc[i].hlc, "goodness")) {
      that.sentiment += 2;
    }
    if (_.contains(hlc[i].hlc, "stronggoodness")) {
      that.sentiment += 3;
    }
  }
}
Message.prototype.fetchCompareWords = function() {
  return this.dict.fetch("pos", ["JJR", "RBR"]);
}

Message.prototype.fetchAdjectives = function() {
  return this.dict.fetch("pos", ["JJ", "JJR", "JJS"]);
}

Message.prototype.fetchAdverbs = function() {
  return this.dict.fetch("pos", ["RB", "RBR", "RBS"]);
}

Message.prototype.fetchNumbers = function() {
  return this.dict.fetch("pos", ["CD"]);
}

Message.prototype.fetchVerbs = function() {
  return this.dict.fetch("pos", ["VB", "VBN", "VBD", "VBZ", "VBP", "VBG"]);
}

Message.prototype.fetchProNouns = function() {
  return this.dict.fetch("pos", ["PRP", "PRP$"]);
}

Message.prototype.lemma = function() {
  var that = this;
  var lemmerEng = new Lemmer('english');

  return _.map(that.taggedWords, function(item, key){ 
    var w = item[0].toLowerCase();
    var lw = lemmerEng.lemmatize(w);
    return (lw.length != 0) ? lw[0].text.toLowerCase() : w;
  });
}

Message.prototype.fetchNouns = function() {
  return this.dict.fetch("pos", ["NN", "NNS", "NNP", "NNPS"]);
}

Message.prototype.fetchList = function() {
  debug("Fetch List");
  var that = this;
  var l = [];
  if (/NNP? CC(?:\s*DT\s|\s)NNP?/.test(that.posString) || /NNP? , NNP?/.test(that.posString)) {
    var sn = false;
    for (var i = 0; i < that.taggedWords.length; i++) {
      if (that.taggedWords[i][1] == "," || that.taggedWords[i][1] == "CC") {
        sn = true;
      }
      if (sn === true && Utils._isTag(that.taggedWords[i][1], 'nouns')) {
        debug(that.taggedWords[i][0]);
        l.push(that.taggedWords[i][0]);
        sn = false;

      }
    }
  }
  return l;
}



// This function will return proper nouns and group them together if they need be.
// This function will also return regular nonus or common nouns grouped as well.
// Rob Ellis and Brock returns ['Rob Ellis', 'Brock']
// @tags - Array, Words with POS [[word, pos], [word, pos]]
// @lookupType String, "nouns" or "names" 
Message.prototype.fetchComplexNouns = function(lookupType) {
  var tags = this.taggedWords;
  var bigrams = ngrams.bigrams(tags); 
  var nouns, tester;

  if (lookupType == "names") {
    tester = function(item) { return (item[1] == "NNP" || item[1] == "NNPS") }  
  } else {
    tester = function(item) { return (item[1] == "NN" || item[1] == "NNS" || item[1] == "NNP" ||  item[1] == "NNPS") }  
  }
  nouns = _.filter(_.map(tags, function(item, key){ return (tester(item)) ? item[0] : null }),Boolean);
  var nounBigrams = ngrams.bigrams(nouns);

  // Get a list of term
  var neTest = _.map(bigrams, function(bigram, key) {
    return _.map(bigram, function(item, key2) { return tester(item); });
  });

  // Return full names from the list
  var fullnames  = _.map(_.filter(_.map(neTest, function(item, key){
    return (_.every(item, _.identity)) ? bigrams[key] : null}), Boolean),
    function(item, key) {
      return (_.map(item, function(item2,key3){return item2[0]  })).join(" ");
    });
  debug("fullnames", lookupType, fullnames)

  var x = _.map(nounBigrams, function(item, key) {
    return _.contains(fullnames, item.join(" "));
   })

  // Filter X out of the bigrams or names?
  _.filter(nounBigrams, function(item, key){
    if (x[key]) {
      // Remove these from the names
      nouns.splice(nouns.indexOf(item[0]), 1);
      nouns.splice(nouns.indexOf(item[1]), 1);
      return nouns;
    }
  })

  return nouns.concat(fullnames);
}

module.exports = Message;
