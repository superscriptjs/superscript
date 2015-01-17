// This is a shim for wordnet lookup.
// http://wordnet.princeton.edu/wordnet/man/wninput.5WN.html

var natural = require("natural");
var wordnet = new natural.WordNet();
var async   = require("async");
var _       = require("underscore");

exports.define = function(word, cb) {
  wordnet.lookup(word, function(results) {
    if (!_.isEmpty(results)) {
      cb(null, results[0].def);
    } else {
      cb("no results");
    }
      
  });
}

// Used to explore a word or concept
// Spits out lots of info on the word
exports.explore = function(word, cb) {
  var ptrs = [];

  wordnet.lookup(word, function(results) {

    console.log("----", results)
    for (var i = 0; i < results.length; i++) {
      ptrs.push(results[i].ptrs);
    }

    ptrs = _.uniq(_.flatten(ptrs));
    ptrs = _.map(ptrs, function(item){ return { pos: item.pos, sym: item.pointerSymbol }});

    ptrs = _.chain(ptrs)
    .groupBy('pos')
    .map(function(value, key) {
        return {
            pos: key,
            ptr: _.uniq(_.pluck(value, 'sym'))
        }
    })
    .value();
    
    var itor = function(item, next) {
      var itor2 = function(ptr, next2) {
        
        wdlookup(word + "~" + item.pos, ptr, function(err, res){
          console.log(word, item.pos, ":", ptr, res.join(", "));
          // console.log(res);
          next2();
        });
      }

      async.map(item.ptr, itor2, next);
    }

    async.each(ptrs, itor, function(){
      cb();
    });
    
  });
  
}

// Does a word lookup
// @word can be a word or a word/pos to filter out unwanted types
var wdlookup = exports.lookup = function(word, pointerSymbol, cb) {

  var match, pos = null;
	pointerSymbol = pointerSymbol || '~';
  match = word.match(/~(\w)$/);
  if (match) {
    pos = match[1];
    word = word.replace(match[0], "");
  }

	var itor = function(word, next) {
		wordnet.get(word.synsetOffset, word.pos, function(sub) {
			next(null, sub.lemma);
		});
	}
  
  var synets = [];

	wordnet.lookup(word, function(results) {
    results.forEach(function(result) {
      result.ptrs.forEach(function(part) {
        if (pos != null && part.pos == pos && part.pointerSymbol == pointerSymbol) {
          synets.push(part);
        } else if (pos == null && part.pointerSymbol == pointerSymbol) {
          synets.push(part);
        }
      });
    });
    
    async.map(synets, itor, function(err, items){
      items = _.uniq(items);
      items = items.map(function(x){ return x.replace(/_/g, " "); });
    	cb(err, items)
    });
   
	});	
}