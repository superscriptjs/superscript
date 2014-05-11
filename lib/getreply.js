var async		= require("async");
var Utils 	= require("./utils");
var debug 	= require("debug")("GetReply");
var dWarn 	= require("debug")("GetReply:Warning");

var regexreply = require("./regexreply");
var processTags = require("./processtags");

var getreply = function(options, callback) {
	
	var plugins = options.plugins;
	var user = options.user;
	var topics = options.topics;
	var sortedSet = options.sorted;
	var message = options.message;
	var context = options.type;
	var step = options.step;
	var topicFlags = options.topicFlags;
	var sorted = options.sorted;
	var topics = options.topics;

	if (!step) step = 0;

	if (step == 40) {
		dWarn("Max Depth Reached");
		return callback(new Error("max depth reached"), null);
	}

	debug("Step depth (" + step +") with ", message.clean);

	// Create a pointer for the matched data when we find it.
	var matched        = null;
	var matchedTrigger = null;
	var foundMatch     = false;

	// Collect data on this user.
	var topic     = user.getTopic();
	var stars     = [];
	var thatstars = []; // For %Previous
	var reply     = '';

	// Are we in the BEGIN block?
	if (context == "begin") {
		topic = "__begin__";
	}

	if (!topics[topic]) {
		dWarn("User " + user.name + " was in an empty topic named '" + topic + "'");
		user.setTopic('random');
		topic = 'random';
	}

	if (!foundMatch) {

		debug("Searching their topic '" + topic + "' for a match...");

		var eachGambitHandle = function(trig, done) {
			var isMatch = false;
			regexreply.parse(trig, function(regexp) {
				// Second Pass with User
				regexreply.postParse(regexp, user, function(regexp) {

					debug("Try to match '" + message.clean + "' against " + trig + " (" + regexp + ")");
				
					var match = message.clean.match(new RegExp('^' + regexp + '$', "i"));
					var qmatch = message.qtype.match(new RegExp('^' + regexp + '$', "i"));
					var pmatch = false;

					if (message.posString) {
						pmatch = message.posString.match(new RegExp('^' + regexp + '$'));
					}
				
					if (match) {
						isMatch = true;

						stars = [];
						if (match.length > 1) {
							for (var j = 1; j <  match.length; j++) {
								stars.push(match[j]);
							}
						}
					} else if (qmatch || pmatch) {
						debug("Match Found with QType or POS");
						isMatch = true;
					}

					// A match somehow?
					// TODO add coverage for this block
					if (isMatch) {
						debug("Found a match!");
						
						// We found a match, but what if the trigger we've matched
						// doesn't belong to our topic? Find it!
						if (!topics[topic][trig]) {
							// We have to find it.
							debug("Different Topic")
							matched = this._find_trigger_by_inheritence(topic, trig, 0);
						} else {
							debug("Match found in Topic", topic)
							matched = topics[topic][trig];
						}

						foundMatch = true;
						matchedTrigger = trig;
					}

					done();
				}); // End PostProcess
			});
		}

		// Repect the sortedset order.
		async.eachSeries(sortedSet["topics"][topic], eachGambitHandle, function(err, res){

			var afterHandle = function() {

				if (context == "begin") {
					// The BEGIN block can set {topic} and user vars.
					var giveup = 0;
					debug("In 'begin' block looking for topic", reply)
					// Topic setter.
					var match = reply.match(/\{topic=(.+?)\}/i);
					while (match) {
						giveup++;
						if (giveup >= 50) {
							dWarn("Infinite loop looking for topic tag!");
							break;
						}
						// TODO Test this block
						var name = match[1];
						this._users[user]["topic"] = name;
						reply = reply.replace(new RegExp("{topic=" + this.quotemeta(name) + "}","ig"), "");
						match = reply.match(/\{topic=(.+?)\}/i); // Look for more
					}
					return callback(null, reply.trim());
				} else {
					// Process more tags if not in BEGIN.
					debug("Not in 'begin', check for more tags", message.clean);

					var pOptions = {
						user: user, 
						msg: message, 
						reply: reply, 
						stars: stars, 
						botstars: thatstars,
						step: step, 
						plutins: plugins, 
						topicFlags: topicFlags,
						sorted: sorted, 
						topics: topics
					};

					return processTags(pOptions,  function(err, reply){
						if (err) {
							dWarn("I think we have a problem", err);
							return callback(err, null);
						} else {
							debug("Calling Back with", reply)
							return callback(null, reply);
						}

						// TODO - Re-Implement this
						// if (err && err.message !== "max depth reached") {
						// 	debug("Error from Custom Function... continue to next message", err);
						// 	var options = {
						// 		user: user, 
						// 		topics: topics, 
						// 		sorted: sortedSet, 
						// 		message: message,
						// 		plugins: plugins,
						// 		step: (step+1),
						// 		type: "normal",
						// 		topicFlags: topicFlags
						// 	}
						// 	return getreply(options, callback);
						// } else {
						// 	debug("Calling Back with", reply)
						// 	return callback(null, reply);
						// }
					});
				}
			}

			// Store what trigger they matched on. If their matched trigger is undefined,
			// this will be too, which is great.
			user["__lastmatch__"] = matchedTrigger;

			if (matched) {
				if (matched["redirect"]) {
					debug("Redirecting us to '" + matched["redirect"] + "'");

					var pOptions = {
						user: user, 
						msg: message, 
						reply: matched["redirect"], 
						stars: stars, 
						botstars: thatstars,
						step: step, 
						plutins: plugins, 
						topicFlags: topicFlags
					};

					processTags(pOptions, function(err, redirect) {
						if (err) {
						} else {
							debug("Pretend user said: '" + redirect + "'");
							// We need to fetch the reply for that key.
							var options = {
								user: user, 
								topics: topics, 
								sorted: sortedSet, 
								message: {clean: redirect, qtype: "SYSTEM:sys" },
								plugins: plugins,
								step: (step+1),
								type: context,
								topicFlags: topicFlags
							}

							return getreply(options, callback);							
						}

					});
				} else {
					var bucket = [];
					for (var rep_index in matched["reply"]) {
						var rep = matched["reply"][rep_index];
						var weight = 1;
						var match  = rep.match(/\{weight=(\\d+?)\}/i);
						if (match) {
							weight = match[1];
							if (weight <= 0) {
								dWarn("Can't have a weight <= 0!");
								weight = 1;
							}
						}

						for (var j = 0; j < weight; j++) {
							bucket.push(rep);
						}
					}

					// Get a random reply.
					var choice = parseInt(Math.random() * bucket.length);
					reply = bucket[choice];
					debug("Looking at choices:", bucket)
					debug("We like this choice", reply)
					afterHandle();
				}
			} else {
				afterHandle();
			}

		}); // End Each 
	}
}

module.exports = getreply;