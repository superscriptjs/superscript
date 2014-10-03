// Not used. See ConceptNet project

var async 			= require("async");
var Knex 				= require("knex");
var _ 					= require("underscore");
var natural 		= require("natural");
var ngrams 			= natural.NGrams;
var debug				= require("debug")("ConceptNet");

var knex = Knex.initialize({
  client: 'mysql',
  connection: {
    host     : '127.0.0.1',
    user     : 'root',
    password : '',
    database : 'conceptnet',
    charset  : 'utf8'
  }
});

var basicFind = function() {
	return knex('assertion')
	.join('concept as c1', 'c1.id', '=' ,'assertion.concept1_id', 'left')
	.join('concept as c2', 'c2.id', '=' ,'assertion.concept2_id', 'left')
	.join('surfaceform as f1', 'f1.id', '=' ,'assertion.best_surface1_id', 'left')
	.join('surfaceform as f2', 'f2.id', '=' ,'assertion.best_surface2_id', 'left')
	.join('frame as frame', 'frame.id', '=' ,'assertion.best_frame_id', 'left')
	.join('rawassertion as raw', 'raw.id', '=' ,'assertion.best_raw_id', 'left')
		.join('sentence', 'sentence.id', '=' ,'raw.sentence_id', 'left')
	.select('c1.text as c1_text', 'c2.text as c2_text', 'c2.num_assertions', 'f1.text as frame1', 'f2.text as frame2', 'sentence.text as sentense', 'frame.text as frame_text' )
	.where('assertion.score', '>', 0)
	.whereNotNull('f1.text')
	.whereNotNull('f2.text')
	.orderBy('c2.num_assertions', 'desc')
	.limit(90).clone();
};

var usedFor = function() {
	return basicFind().andWhere('assertion.relation_id', 7).clone();
}
var isA = function() {
	return basicFind().andWhere('assertion.relation_id', 5).clone();
}
var basicForward = function(term) {
	return basicFind().andWhere('c1.text', term).clone();
}
var basicReverse = function(term) {
	return basicFind().andWhere('c2.text', term).clone();
}

var usedForForward = exports.usedForForward = function(term, callback) {
	usedFor().andWhere('c1.text', term).exec(callback);
}

var usedForReverse = exports.usedForReverse = function(term, callback) {
	usedFor().andWhere('c2.text', term).exec(callback);
}

var isAForward = exports.isAForward = function(term, callback) {
	isA().andWhere('c1.text', term).exec(callback);
}

var isAReverse = exports.isAReverse = function(term, callback) {
	isA().andWhere('c2.text', term).exec(callback);
}

var getAssertion = function(c1, c2, callback) {
	basicForward(c1).andWhere('c2.text', c2).exec(callback);
}

exports.assertionLookupForward = function(term, callback) {
	basicForward(term).exec(callback);
}

// PUT IN or PUT ON
// What do you use to put X in 
// food => dish
// nail => hammer
// car => garage
var putConcept = exports.putConcept = function(term, callback) {
	debug("IN PutConcept", term);
	usedForReverse(term, function(err, concepts){
		var map = {};
		var itor = function(item, cb) {
			var concept = item.c1_text;
			usedForForward(concept, function(err, concepts2) {			
				map[concept] = 0;
				for (var n = 0; n < concepts2.length; n++) {
					if (concepts2[n].c2_text.indexOf(term) !== -1) {
						map[concept] += 1;
					}
				}
				cb(null, map);
			});
		}

		async.map(concepts, itor, function(err, result){
			var set = result[0];
			var keysSorted = Object.keys(set).sort(function(a,b){return set[b]-set[a]});
			// TODO, if the top items are equal maybe pick one randomly
			debug("Put res", keysSorted);
			callback(null, keysSorted[0]);
		});
	});
}

var assersionTest = exports.assersionTest =  function(conceptText, term, cb ) {
	
	isAForward(conceptText, function(err, concepts2) {
		var lcount = 0, ecount = 0;
		for (var i = 0; i < concepts2.length; i++) {
			if (concepts2[i].c2_text == term) {
				ecount++
			}
			if (concepts2[i].c2_text.indexOf(term) !== -1) {
				lcount++
			}
		}

		cb(null, (lcount / concepts2.length))
	});
}


var resolveFact = exports.resolveFact =  function(conceptText, term, cb ) {
	isAForward(conceptText, function(err, concepts2) {
		
		// Remove dups
		var uniq = _.uniq(concepts2.map(function(item){return item.c2_text}));
		var map = [];
		var itor = function(concept, callback) {
			assersionTest(concept, term, function(err, val){
				if (val > 0.01) {
					map.push([concept, val]);
				}
				callback(null)
			});
		}

		async.each(uniq, itor, function() {
			var keysSorted = map.sort(function(a,b){return b[1] - a[1]});
			debug("resolveFact", keysSorted);
			if (keysSorted.length != 0)
				cb(null, keysSorted[0][0]);
			else {
				cb(null, null);
			}
		});
	});
}

var stopwords = ["for", "like", "use", "an", "if", "of", "to", "the", "is", "a", "i", "are", "and", "who", "what", "where", "when","how", "would", "which", "or", "do", "my", "bob"];

var conceptLookup = exports.conceptLookup = function(msg, callback) {
	
	var words1 = ngrams.ngrams(msg, 1);
	var words2 = ngrams.bigrams(msg);
	var words3 = ngrams.ngrams(msg, 3);

	words2 = words2.concat(words1);
	words3 = words3.concat(words2);

	words3 = _.map(words3, function(key, item) { return key.join(" "); });
	words3 = _.reject(words3, function(word) { return _.contains(stopwords, word.toLowerCase()) });

	var itor = function(item, cb) {
		knex('concept')
			.select('text', 'num_assertions', 'visible')
			.where('num_assertions', '!=', 0)
			.andWhere('text', item )
			.exec(cb)		
	}
	
	async.mapSeries(words3, itor, function(err, res){
		var concepts = _.filter(_.flatten(res), Boolean);

		var newWords = _.map(_.filter(concepts, Boolean), function(item){ return item.text});
		newWords = _.reject(newWords, function(word) { return _.contains(stopwords, word) });


		// var compoundConceptBigrams = ngrams.bigrams(newWords);
		// compoundConceptBigrams = _.map(compoundConceptBigrams, function(key, item) { return key.join(" ");  });

		// async.mapSeries(compoundConceptBigrams, itor, function(err, moreConcepts){
		// 	var moreConcepts = _.filter(_.flatten(moreConcepts), Boolean);
		// 	concepts = concepts.concat(moreConcepts)
			callback(null, concepts)
		// });
	});
}

// How are 2 concepts Related
// Returns an array of objects with num_assersions
var relatedConcepts = exports.relatedConcepts = function(c1, c2, callback) {
	var terms = [];
	isAForward(c1, function(err, res1){
		isAForward(c2, function(err, res2){
			var map1 = [], map2 = [];

			_.each(res1, function(item){
				map1.push({text:item.c2_text, num: item.num_assertions})
			});

			_.each(res2, function(item){
				map2.push({text:item.c2_text, num: item.num_assertions})
			});

			var results = _.uniq(_.intersect(map1, map2));
			callback(null, results)
		});
	});
}


var constructSurface = exports.constructSurface = function(concept1, concept2, callback) {
	getAssertion(concept1, concept2, function(err, fullconcept){
		var x = getRandomInt(0, fullconcept.length - 1);
		callback(null, fullconcept[x].sentense);
	});
}


// Helper, intersect Objects
_.intersect = function(array) {
  var slice = Array.prototype.slice; // added this line as a utility
  var rest = slice.call(arguments, 1);
  return _.filter(_.uniq(array), function(item) {
    return _.every(rest, function(other) {
      return _.any(other, function(element) { return _.isEqual(element, item); });
    });
  });
};

exports.getRandomInt = getRandomInt = function(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}


// constructSurface("hammer", "build", function(err, res){
// 	// We are going to cheat and just return the sentense.
// 	// var x = getRandomInt(0,res.length - 1)
// 	console.log(err, res);
// })

// relatedConcepts("flower", "plant", function(err, res){
// 	console.log(res);
// 	process.exit();
// });

// What is the color of the ocean
// Is the ocean cold
resolveFact("fly south","bird", function(err, res){
	console.log(err, res);
});

// isAForward("capital india", function(err, res){
// 	console.log(err, res);
// })

// conceptLookup("What is the capital of spain?", function(err, concepts){
// 	console.log(concepts);
// })
