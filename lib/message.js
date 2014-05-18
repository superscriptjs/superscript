var pos 		= require("pos");
var _ 			= require("underscore");
var natural = require("natural");
var math 		= require("./math");
var ngrams 	= natural.NGrams;
var debug 	= require("debug")("Message");

function Message(msg, qtypes, norm) {
	debug("Creating message from:", msg);

	if (!msg) return;

	var that = this;
	that.raw = msg;
	that.clean = norm.clean(msg);

	if (that.clean != that.raw) {
		debug("DIFF", "'" + that.clean +"', '" + that.raw + "'");
	}

  that.words = math.convertWordsToNumbers(new pos.Lexer().lex(that.clean));

  // In the event that we converted math terms, 
  // lets keep the clean in sync with words array
  that.clean = that.words.join(" ");

  that.taggedWords = new pos.Tagger().tag(that.words);
  that.posString = (_.map(that.taggedWords, function(item, key){ return item[1]; })).join(" ");
  that.qtype = qtypes.classify(that.clean);

  // Get Nouns and Noun Phrases.
  that.nouns = this.fetchComplexNouns("nouns");
  that.names = this.fetchComplexNouns("names");

  that.adjectives = this.fetchAdjectives();
  that.adverbs = this.fetchAdverbs();
  that.verbs = this.fetchVerbs();
  that.pnouns = this.fetchProNouns();
  that.compareWords = this.fetchCompareWords();
	that.compare = (that.compareWords.length != 0)

  // THIS OR THAT
  if (/NNS? CC(?:\s*DT\s|\s)NNS?/.test(that.posString) && _.contains(that.words, "or")) {
		that.thisOrThat = true;
  }

	var numCount = 0;	
	for (var i = 0; i < that.taggedWords.length; i++) {
		if (that.taggedWords[i][1] == 'CD' || that.taggedWords[i][1] == 'SYM') { 
			numCount++;
		}

		if (math.mathTerms.indexOf(that.taggedWords[i][0]) !== -1) {
			numCount += 2;
		}
	}
	
	that.numericExp = (numCount >= 3) ? true : false;
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
  var vb = _.map(that.taggedWords, function(item, key){ return item[1] == "VB" || item[1] == "VBN" })
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
