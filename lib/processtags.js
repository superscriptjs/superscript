var Utils 	= require("./utils");
var debug 	= require("debug")("ProcessTags");
var dWarn 	= require("debug")("ProcessTags:Warning");

// Process tags in a reply element.
module.exports = function (userObj, msg, reply, st, bst, step, plugins, topicFlags, callback) {

	var that = this;
	var output = "";
	// Prepare the stars and botstars.
	var stars = [""];
	stars.push.apply(stars, st);
	var botstars = [""];
	botstars.push.apply(botstars, bst);
	if (stars.length == 1) {
		stars.push("undefined");
	}
	if (botstars.length == 1) {
		botstars.push("undefined");
	}

	// For while loops.
	var match;
	var giveup = 0;
	var newtopic;
	var duplicateMessage = false;

	reply = reply.replace(/<cap>/ig, stars[1]);
	reply = reply.replace(/<botstar>/ig, botstars[1]);
	for (var i = 1; i <= stars.length; i++) {
		reply = reply.replace(new RegExp("<cap" + i + ">","ig"), stars[i]);
	}

	reply = reply.replace(/\\s/ig, " ");
	reply = reply.replace(/\\n/ig, "\n");
	reply = reply.replace(/\\#/ig, "#");

	// Topic setter.
	match = reply.match(/\{topic=(.+?)\}/i);
	giveup = 0;

	while (match) {

		giveup++;
		if (giveup >= 50) {
			dWarn("Infinite loop looking for topic tag!");
			break;
		}
		var name = match[1];
		// debug("Topic Change", name)
		// userObj.setTopic(name);
		newtopic = name;		
		reply = reply.replace(new RegExp("{topic=" + Utils.quotemeta(name) + "}","ig"), "");
		match = reply.match(/\{topic=(.+?)\}/i); // Look for more
	}

	// Inline redirector.
	match = reply.match(/\{@(.+?)\}/);
	giveup = 0;
	while (match) {
		giveup++;
		if (giveup >= 50) {
			dWarn("Infinite loop looking for redirect tag!");
			break;
		}

		var target = this._strip(match[1]);
		debug("Inline redirection to: " + target);
		var subreply = this._getreply(userObj, target, "normal", step+1, scope);
		reply = reply.replace(new RegExp("\\{@" + Utils.quotemeta(target) + "\\}", "i"), subreply);
		match = reply.match(/\{@(.+?)\}/);
	}


	// <input> and <reply>
	var input0 = userObj["__history__"]["input"][0];
	// Special case, we have no items in the history yet,
	// This could only happen if we are trying to match the first input
	if (userObj["__history__"]["input"][0] == undefined) {
		input0 = msg.clean;
	}

	reply = reply.replace(/<input>/ig, input0);
	reply = reply.replace(/<reply>/ig, userObj["__history__"]["reply"][0]);
	for (var i = 1; i <= 9; i++) {
		if (reply.indexOf("<input" + i + ">")) {
			reply = reply.replace(new RegExp("<input" + i + ">","ig"),
				userObj["__history__"]["input"][i]);
		}
		if (reply.indexOf("<reply" + i + ">")) {
			reply = reply.replace(new RegExp("<reply" + i + ">","ig"),
				userObj["__history__"]["reply"][i]);
		}
	}

	// Automatically reject input that has been said
	
	var currentTopic = userObj.getTopic();
	var currentFlags = topicFlags[currentTopic];

	// No history yet.. must be the first message.
	if (currentFlags == undefined) {
		currentFlags = topicFlags[userObj.getTopic()];
	}

	if (currentFlags.indexOf("keep") == -1) {
		for (var i = 0; i <= 10; i++) {
			var topicItem = userObj["__history__"]["topic"][i];
			if (topicItem != undefined) {

				var pcmsg = userObj["__history__"]["input"][i].clean;
				var flags = topicFlags[topicItem];
				if (pcmsg == msg.clean && flags.indexOf("keep") == -1) {
					debug("Not going to repeat ourselves.");
					duplicateMessage = true;
					reply = "";
				}
			}
		}
	}

	// We set the topic back to what it was before this one.
	// console.log(userObj["__history__"]["topic"])
	if (currentFlags.indexOf("nostay") !== -1) {
		// We want to set the topic to the pevious one
		// Since we have not saved the new one in the history yet, we just us the last one.
		var top = userObj["__history__"]["topic"][0];
		newtopic = top;
	}

	// We only want to change topics if the message has not been exausted
	if (newtopic && !duplicateMessage) {
		debug("Topic Change", newtopic)
		userObj.setTopic(newtopic);
	}


	// Process Custom functions
	if (match = reply.match(/\^(\w+)\(([\w<>,\s]*)\)/)) {

		var obj = Utils.trim(match[1]);
		var partsStr = Utils.trim(match[2]);
		var parts = partsStr.split(",");
	
		var args  = [];
		for (var i = 0; i < parts.length; i++) {
			if (parts[i] != "") {
				args.push(parts[i].trim());
			}
		}

		debug("Custom Function Found", obj);
				
		if (plugins[obj]) {

			var scope = {
				message: msg,
				user: userObj
			}

			// Push the Callback onto the end.
			args.push(callback);	
			debug("Calling", obj);
			plugins[obj].apply(scope, args);
		} else {
			dWarn("Custom function not found", obj)
			return callback(null, "");
		}
		
	} else {
		debug("Calling back with", Utils.trim(reply))
		return callback(null, Utils.trim(reply));
	}

};