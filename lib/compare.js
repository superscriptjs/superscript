var debug 		= require("debug")("Compare Nouns");
var _					= require("underscore");

// Offload Compare logic.
// compareWords = Array of things to compare
// Return an array of the items sorted or null
// Right now this returns a fully formed reply and that should probably change or null

// TODO Replace these with Fact Tables
// var sizes 		= require("../lib/things");

// TODO Load Oppisites

module.exports = function(message, user, facts, cb) {

	debug("comparePhrase", message.compareWords, message.nouns);	

	var memory = user.memory;
	var suggestedReply = "";
	if (message.compareWords.length == 2 && message.compareWords[0] === message.compareWords[1] ) {

		// We have multiple compare words that are the same
		// given: If John is taller than Mary, who is the taller?
		
		var oppisiteWord = facts.query("direct_sv", message.compareWords[0], "opposite");
		var relation = memory.domain.Relation.fetch(message.compareWords[0]);
		
		// Lets create a new Relation
		if (!relation && oppisiteWord) {
			memory.createRelation(message.compareWords[0], oppisiteWord, true);
		}


		if (message.nouns.length == 2) {
			suggestedReply = message.nouns[0] + " is " + message.compareWords[0] + " than " + message.nouns[1] + ".";		
			memory.createfact(message.nouns[0], message.compareWords[0], message.nouns[1]);
		} else {
			// given: John is older than Mary, and Mary is older than Sarah.
			// We already know the JJR is the same
			if (message.nouns.length == 4) {
				memory.createfact(message.nouns[0], message.compareWords[1], message.nouns[1], true);
				memory.createfact(message.nouns[2], message.compareWords[1], message.nouns[3], true);
			}
		}

		cb(null, suggestedReply, memory);

	} else if (message.compareWords.length == 2 && message.compareWords[0] !== message.compareWords[1]) {

		// This Block compares 2 words that are not the same
		// given: If John is taller than Mary, who is the shorter?
		// nouns: John, Mary compareWords: taller, shorter

		var f1 = facts.query("direct_sv", message.compareWords[0], "opposite");
		var f2 = facts.query("direct_vo", "opposite", message.compareWords[0]);

		var isOppisite = _.contains(_.unique(f1.concat(f2)), message.compareWords[1]);

		if (isOppisite)	{
			debug("Terms are oppisite");
			if (message.nouns.length == 2) {
				memory.createfact(message.nouns[1], message.compareWords[1], message.nouns[0]);

				suggestedReply = message.nouns[1] + " is " + message.compareWords[1] + " than " + message.nouns[0] + ".";	
				debug("Suggest Reply", suggestedReply);
				
				cb(null, suggestedReply, memory);
			} else {
				// How many nouns do we have?
			}
		} else {
			debug("Terms are not oppisite");
			// We have multiple compare words that are not the same or oppisite
			// given: If John is taller than Mary, who is the faster?
			// nouns: John, Mary compareWords: taller, faster

			memory.createfact(message.nouns[0], message.compareWords[0], message.nouns[1]);
			
			var f1 = facts.query("direct_sv", message.compareWords[0], "opposite");
			var f2 = facts.query("direct_vo", "opposite", message.compareWords[0]);
			var opp = _.unique(f1.concat(f2));

			// So the real question is message.compareWords[1]
			if(memory.query("direct_svo", message.nouns[0], message.compareWords[1], message.nouns[1])) {
				suggestedReply = "Nice try, " + message.nouns[0] + " is " + message.compareWords[1] + ".";
			} else {
				if (opp.length != 0) {
					suggestedReply = "Don't you mean who is " + opp[0] + "?" ;	
				} else {
					suggestedReply = "I think a " + message.nouns[0] + " is " + message.compareWords[0] + ", but I'm not positive.";	
				}
			}

			cb(null, suggestedReply, memory);
		}

	} else if (message.compareWords.length == 1 && message.nouns.length == 2) {
		
		if (_.contains(['bigger','larger'], message.compareWords[0])) {

			// TODO: This needs lots more love

			sizes.cmp(message.nouns, function(e, res){
				if (res) {
					cb(null, "I think a " + res + " is " + message.compareWords[0] + ".");
				} else {
					cb(null, "I think a " + message.nouns[0] + " is " + message.compareWords[0] + ", but I'm not positive.");		
				} 
			})
		} else if (_.contains(['faster', 'fast'], message.compareWords[0])) {
			// SPEED Fact or question

			var speedResult = facts.compareObject(message.nouns[0], message.nouns[1], "speed");

			if (speedResult != null) {
				if (message.leadingQuestion || message.tailQuestion) {
					if (speedResult == 0) {
						suggestedReply = "They are both about the same.";	
					} else if (speedResult < 0) {
						suggestedReply = message.nouns[0] + " is faster than " + message.nouns[1] + ".";	
					} else {
						suggestedReply = message.nouns[1] + " is faster than " + message.nouns[0]+ ".";
					}
					
					cb(null, suggestedReply, memory);
				} else {
					memory.createfact(message.nouns[0], "faster", message.nouns[1]);
					cb(null, message, memory);
				}

			} else {
				if (obj.leadingQuestion || obj.tailQuestion) {
					obj.suggestReply = "I'm not sure which is faster, why don't you tell me.";
				} else {
					// Do we already know about this fact?
					var speedResult1 = memory.query("direct_svo", obj.nouns[0], obj.compareWords[0], obj.nouns[1]);
					if (speedResult1 == true) {	
						obj.suggestReply = obj.nouns[0] + " is faster than " + obj.nouns[1] + ", if memory serves.";
					} else {
						// TODO: Maybe FactCheck this?
						debug("Adding new concepts to memory");
						memory.createfact(obj.nouns[0], obj.compareWords[0], obj.nouns[1]);
					}
				}

				cb(null, message, memory);	
				
			}
			
		} else {
			debug("Compare Term Lookup Compare Word Miss", message.compareWords[0]);
			// We need to lookup previous facts to help us try to answer this type of question.

			var cmpResult1 = memory.query("direct_svo", message.nouns[0], message.compareWords[0], message.nouns[1]);
			var cmpResult2 = memory.query("direct_svo", message.nouns[1], message.compareWords[0], message.nouns[0]);
			

			if (cmpResult1 === true) {	
				suggestedReply = message.nouns[0] + " is " + message.compareWords[0] +" than " + message.nouns[1] + ", if memory serves.";
			} else if (cmpResult2 === true) {
				suggestedReply = message.nouns[1] + " is " + message.compareWords[0] +" than " + message.nouns[0] + ", if memory serves.";
			} else {
				// Guess
				suggestedReply = "I think a " + message.nouns[0] + " is " + message.compareWords[0] + ", but I'm not positive.";
			}
		
			
			cb(null, suggestedReply, memory);
		}
		
	} else {
		// Nothing to compare.
		cb(null, null);
	}
}
