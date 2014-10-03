var debug 	= require("debug")("Self");
var async   = require("async");
var _       = require("underscore");
var Utils   = require("../utils");

module.exports = function(message, user, facts, cnet, cb) {

	var suggest = "";
	// User Aquisition
	if (message.isQuestion && (_.contains(message.pronouns, "your") || _.contains(message.pronouns, "you"))) {
		
		if (message.dict.containsHLC("own")) {
			if (message.dict.containsHLC("favorite")) {
				suggest = "I don't have a favorite " + findThing(message) + ".";
			} else if (message.dict.containsHLC("objects")) {
				if (message.dict.fetchHLC("objects").pos === "NNS") {
					suggest = "I don't own any.";
				} else {
					suggest = "I don't own one.";
				}
			}
		} else if(message.dict.containsHLC("read")) {
			suggest = "Yes I like to read";
		} else if (message.dict.containsHLC("favorite")) {
			var thing = findThing(message);
		
			suggest = findOrAquire(thing, message, facts);
		} else {
			suggest = "I'm not ready to talk about myself yet :)";
		}
		cb(null, suggest);
	} else {
		cb(null, null);
	}
};

var findThing = function(message) {
	return message.cNouns[0];
};

var findOrAquire = function(thing, message, facts) {
	// Do I have this item already?
	// TODO: Thing could be a complex word like "french fries" and not exist in the dict.
	var thing = message.dict.get(thing);
	// debug("Thing", thing, message.dict.get(thing))
	var v1 = facts.query("direct_sv", thing.lemma, "favorite");
	var v2 = facts.query("direct_sv", thing.lemma, "own");

	if (_.isEmpty(v1) && _.isEmpty(v2)) {
		// What do we know about this?
		if (thing.lemma == "color") {
			debug("--", JSON.stringify(null, 2, facts.query("direct_s", "colors")));
		}
	}

	debug("F or O", v1, v2);
	return "red";

}