var pos 		= require("pos");
var _ 			= require("underscore");
var natural = require("natural");
var math 		= require("./math");
var ngrams 	= natural.NGrams;
var debug 	= require("debug")("Message");
var tense = require("node-tense");

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
   "past plural": "pastpl",
   "past participle": "ppart" 
}

function Message(msg, qtypes, norm, cb) {
	
	debug("Creating message from:", msg);

	if (!msg) {
		debug("Callback Early, empty msg")
		return cb({});
	}

	var that = this;
	that.raw = msg;
	that.clean = norm.clean(msg);
  that.words = new pos.Lexer().lex(that.clean);
  that.cwords = math.convertWordsToNumbers(new pos.Lexer().lex(that.clean));

  that.taggedWords = new pos.Tagger().tag(that.words);
  that.posString = (_.map(that.taggedWords, function(item, key){ return item[1]; })).join(" ");
  
  that.qtype = qtypes.classify(that.clean);
  that.qSubType = qtypes.questionType(that.clean);
  that.isQuestion = qtypes.isQuestion(that.clean);

  // Get Nouns and Noun Phrases.
  that.nouns = this.fetchComplexNouns("nouns");
  that.names = this.fetchComplexNouns("names");

  that.adjectives = this.fetchAdjectives();
  that.adverbs = this.fetchAdverbs();
  that.verbs = this.fetchVerbs();
  that.pnouns = this.fetchProNouns();
  that.compareWords = this.fetchCompareWords();
	that.compare = (that.compareWords.length != 0);
	var _tense = [];

  // THIS OR THAT
  // TODO, this has been replaced with qTypes
  if (/NNS? CC(?:\s*DT\s|\s)NNS?/.test(that.posString) && _.contains(that.words, "or")) {
		that.thisOrThat = true;
  }

	var numCount = 0;
	var oppCount = 0;
	var convevertedTaggedWords = new pos.Tagger().tag(that.cwords);
	for (var i = 0; i < convevertedTaggedWords.length; i++) {
		if (convevertedTaggedWords[i][1] == 'CD') { 
			numCount++;
		}
		if (convevertedTaggedWords[i][1] == 'SYM' || math.mathTerms.indexOf(convevertedTaggedWords[i][0]) !== -1) {
			oppCount++;
		}
	}

	that.numericExp = (numCount >= 2 && oppCount >= 1) ? true : false;
	that.halfNumericExp = (numCount == 1 && oppCount == 1) ? true : false;

	tense(function(v){
		debug("IN Tense")
		for (var i = 0; i < that.verbs.length; i++) {
			console.log("--", v);
			var x = v.tense(that.verbs[i]);
			_tense.push(verbTensesAliases[x]);
		}

		if (_tense.length == 1) {
			that.tense = _tense[0];
		} else {
			// TODO figure out how to handle this :)
		}
		debug("Calling Back from MSG")
		cb(that);
	});

}

Message.prototype.fetchCompareWords = function() {
	var that = this;
	var cc = _.map(that.taggedWords, function(item, key){ return item[1] == "JJR" || item[1] == "RBR" })
	return _.filter(_.map(cc, function(item, key){ if(item) return that.words[key]}), Boolean);	
}

Message.prototype.fetchAdjectives = function() {
	var that = this;
	var j = _.map(that.taggedWords, function(item, key){ return item[1] == "JJ" || item[1] == "JJR" || item[1] == "JJS" })
	return _.filter(_.map(j, function(item, key){ if(item) return that.words[key].toLowerCase()}), Boolean);
}

Message.prototype.fetchAdverbs = function() {
	var that = this;
  var rb = _.map(that.taggedWords, function(item, key){ return item[1] == "RB" || item[1] == "RBR" || item[1] == "RBS"  })
  return _.filter(_.map(rb, function(item, key){ if(item) return that.words[key].toLowerCase()}), Boolean);
}

Message.prototype.fetchVerbs = function() {
	var that = this;
  var vb = _.map(that.taggedWords, function(item, key){ return item[1] == "VB" || item[1] == "VBN" || item[1] == "VBD" || item[1] == "VBZ" || item[1] == "VBP" || item[1] == "VBG"})
  return _.filter(_.map(vb, function(item, key){ if(item) return that.words[key].toLowerCase()}), Boolean);
}

Message.prototype.fetchProNouns = function() {
	var that = this;
  var pnoun = _.map(that.taggedWords, function(item, key){ return item[1] == "PRP" ||  item[1] == "PRP$"})
  return _.filter(_.map(pnoun, function(item, key){ if(item) return that.words[key].toLowerCase() }), Boolean);
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
	var neTest = _.map(bigrams, function(bigram, key){ 
		return _.map(bigram, function(item, key2){ return tester(item) });
	});

	// Return full names from the list
	var fullnames  = _.map(_.filter(_.map(neTest, function(item, key){
		return (_.every(item, _.identity)) ? bigrams[key] : null}), Boolean),
		function(item, key) {
			return (_.map(item, function(item2,key3){return item2[0]	})).join(" ");
		});
	
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
