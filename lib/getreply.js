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
	var thats = options.thats;

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





	if (step == 0) {
		var allTopics = [ topic ];
		// if (this._includes[topic] || this._lineage[topic]) {
		// 	// Get ALL the topics!
		// 	allTopics = this._get_topic_tree(topic);
		// }


		var eachPrevItor = function(top, cb) {
			debug("Checking topic " + top + " for any %Previous's.");

			if (sortedSet["thats"][top]) {
				// There's one here!
				debug("There's a %Previous in this topic!");

				// Do we have history yet?
				var lastReply = user["__history__"]["reply"][0];
				// TODO - Parse this to MSG Obj
				debug("Last reply: " + lastReply);
				
				if (lastReply) {

					// We need to close over lastReply
					var eachPrevTrigItor = function(trig, cb1) {
						debug("eachPrevTrigItor", trig);
						regexreply.parse(trig, function(botside) {
							debug("Try to match lastReply '" + lastReply + "' against " + trig + " (" + botside + ")");
							var match = lastReply.match(new RegExp('^' + botside + '$', 'i'));

							if (match) {
								debug("Bot side matched!");

								thatstars = []; // Collect the bot stars in case we need them.
								for (var k = 1; k < match.length; k++) {
									thatstars.push(match[k]);
								}

								// One more itor
								var subTrigItor = function(subtrig, cb2) {
									regexreply.parse(subtrig, function(humanside) {

										debug("Now try to match " + message.clean + " to " + humanside);
										match = message.clean.match(new RegExp("^" + humanside + "$"));

										if (match) {
											debug("Found a match!", top, trig, subtrig );
											matched = thats[top][trig][subtrig];
											matchedTrigger = subtrig;
											
											// Collect the stars.
											stars = [];
											if (match.length > 1) {
												for (var j = 1, jend = match.length; j < jend; j++) {
													stars.push(match[j]);
												}
											}
										}

										cb2(null);

									});
								}

								async.eachSeries(sortedSet["that_trig"][top][trig], subTrigItor, function(err, res){
									cb1(null);
								});


							} else {
								cb1(null);	
							}

						});
					}

					async.eachSeries(sortedSet["thats"][top], eachPrevTrigItor, function(err, res){
						cb(null);
					});
				} else {
					cb(null);	// No need to continue	
				}
			} else {
				cb(null);	// No need to continue
			}

		}

		async.eachSeries(allTopics, eachPrevItor, function(err, res) {
		
			// We have some work todo to get back to index here...
			// TODO make afterhandle work in this block too!
			// REPLACE THIS -->
			if (matched) {
				var pOptions = {
					user: user, 
					msg: message, 
					reply: matched["reply"][0], 
					stars: stars, 
					botstars: thatstars,
					step: step, 
					plugins: plugins, 
					topicFlags: topicFlags,
					sorted: sorted, 
					topics: topics
				};
			
				return processTags(pOptions,  function(err, reply){
					if (err) {
						dWarn("Error in ProcessTags Callback", err);
						return callback(err, null);
					} else {
						debug("Calling Back with", reply)
						return callback(null, reply);
					}
				});

			}
			// REPLACE THIS <--

		});

	}



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








	if (!foundMatch) {

		debug("Searching their topic '" + topic + "' for a match...");

		

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
						plugins: plugins, 
						topicFlags: topicFlags,
						sorted: sorted, 
						topics: topics
					};

					return processTags(pOptions,  function(err, reply){
						if (err) {
							dWarn("Error in ProcessTags Callback", err);
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
							// TODO test this.
							callback(err, null);
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