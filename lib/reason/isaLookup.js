var debug 		= require("debug")("ISA");
var _ 				= require("underscore");
// Handles ISA and Used For concepts

module.exports = function(user, obj, memory, concept, cb) {
	debug("IN isAForward NLU");
	// One Noun or Concept containing IS
	// ISA
	// TODO Switch between WHERE and WHAT WP Form
	// What does Harry like to play?

	// Grab the last concept if no noun is found

	// var thing = (obj.nouns.length == 1) ? obj.nouns[0] : obj.concepts.slice(-1).pop().text
	if (obj.nouns.length == 1) {
		var thing = obj.nouns[0];
	} else if (obj.concepts.length != 0) {
		var thing = obj.concepts.slice(-1).pop().text;
	} else {
		debug("NO THANG found");
		var thing = null;
	}
	
	debug("Item in question:", thing);

	var getRandomInt = function (min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	// Generic Callback for Concept
	var conceptHandle = function(err, concepts1) {
		if (concepts1.length != 0) {
			var i = getRandomInt(0, concepts1.length - 1);
			debug("Reply", concepts1[i].sentense);
			cb(null, concepts1[i].sentense);
		} else {
			if (obj.concepts.length != 0) {
				// Dig a little deeper...
				debug("Digging deeper", obj.concepts[0])

				concept.assertionLookupForward(obj.concepts[0].text, function(err, concepts) {
					if (concepts.length != 0) {
						debug("Reply", concepts[0].sentense);
						cb(null, concepts[0].sentense);
					} else {
						cb(null, "I'm not sure.");
					}
				});

			} else {
				cb(null, "I'm not sure what " + thing + " is.");
			}
		}
	}

	if (_.contains(obj.words, "for") || _.contains(obj.words, "with")) {
		debug("UsedFor Concept Lookup");
		// Use UsedFor
		// If we have a NOUN AND Concept as in 
		// What/Question does John/NNP like to fish/Concept for/FOR?
		// And make sure they are not the same.
		if (obj.concepts.length != 0 && obj.nouns.length != 0 && obj.concepts[0] != obj.nouns[0]) {

			// History Lookup then fall back to Adverb Concept WHY match
			// 1. What does John like to fish for?
			//   - Do we know a JOHN that likes to fish?
			// 2. Why would you fish (fun, sport, relax) (Motivated by)
			//   - NNP likes to ADVERB for|to Concept Result.

			var verb = (obj.adverbs.length != 0) ? obj.adverbs[0] : obj.verbs[0];
			var item = memory.query("direct_sv", thing, verb);

			if (item.length == 1) {
				cb(null, "I believe the answer you are looking for is " + item[0] + ".");
			} else if (item.length > 1) {
				cb(null, "It could be "+ item[0] + " or " + item[1]);	
			} else {
				if (obj.nouns.length == 1) {
					debug("Used for, failed History lookup with one Noun.");
					concept.isAForward(thing, conceptHandle);

					
					// cb(null, "I'm not sure.")
				} else {
					concept.resolveFact(obj.nouns[1], obj.nouns[0], function(err, value) {
						cb(null, " I think it is " + value)
					});
				}
			}	
		} else {
			debug("Using FOR");
			concept.usedForForward(thing, conceptHandle);
		}
	} else {
		debug("Using ISA");

		// If we have a PRP$ (Possessive pronoun) Lets do a memory lookup
		// PPR$ could be 'your' or 'my' Big difference.
		// Otherwise treat it as a concept

		if (_.contains(obj.tags, "PRP$") && _.contains(obj.words, "your")) {
			debug("PRP$ Your Pronoun");
			// User> What is YOUR religion
			// Do I have THING
			// Do I make one up?

			cb(null, "I don't have one.");
		
		} else if (_.contains(obj.tags, "PRP$") && _.contains(obj.words, "my")) {
			debug("PRP$ MY Pronoun");
			// User> What is MY religion
			// History lookup

			var myThing = memory.query("direct_sv", thing, "my");
			debug("myThing", myThing)
			if(myThing != -1) {
				cb(null, "It is " + rs.sc.toWord(rs.sc.pick(myThing)) + ".");
			} else {
				cb(null, "I don't think you told me your " + thing + ".");	
			}
		} else {
			// Use local before going to conceptNet
			// TODO - Refresh this
			if (_.contains(obj.concepts, thing.toLowerCase())) {
				var isaConcept = memory.query("direct_sv", thing, "isa");
				if (isaConcept.length != 0) {
					debug("HERE1", isaConcept)
					var wordPhrase = memory.makeSingle(memory.toWord(memory.pick(isaConcept)));
					cb(null, thing + " is a " + wordPhrase + ".");
				} else {
					debug("HERE2", isaConcept)
					concept.isAForward(thing, conceptHandle);	
				}
			} else {

				debug("HERE3 else", thing)
				if (!_.contains(obj.concepts, thing.toLowerCase()) && !_.contains(obj.concepts2, thing.toLowerCase())) {
					// Maybe I was just told or have this fact on hand.
					var local = memory.query("direct_sv", thing, "isa");
					if (local.length != 0) {
						debug("All things", local);
						// Force return 1
						// cb(null, local[0]);
						// This seems to be wrong more then right
						cb(null, "");
						// cb(null, thing + " is a " + rs.sc.toWord(rs.sc.pick(local)) + ".");	
					} else {
						concept.isAForward(thing, conceptHandle);
					}
				} else {
					concept.isAForward(thing, conceptHandle);		
				}
			}			
		}
	}	
}