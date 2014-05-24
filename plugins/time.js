var moment = require("moment");
var COEFF = 1000 * 60 * 5;

var getSeason = function() {

	var now = moment();
	now.dayOfYear()
	var doy = now.dayOfYear();

	if (doy > 80 && doy < 172) {
		return "spring";
	} else if (doy > 172 && doy < 266) {
		return "summer"
	} else if (doy > 266 && doy < 357) {
		return "fall"
	} else if ( doy < 80 || doy > 357) {
		return "winter";
	}
}

exports.getDate = function(cb) {
	cb(null, moment().format("ddd, MMMM Do"));
}

exports.getDateTomorrow = function(cb) {
	var date = moment().add('d', 1).format("ddd, MMMM Do");
	cb(null, date);
}

exports.getSeason = function(cb) {
	var date = moment().add('d', 1).format("ddd, MMMM Do");
	cb(null, getSeason());
}

exports.getTime = function(cb) {
	var date = new Date();
	var rounded = new Date(Math.round(date.getTime() / COEFF) * COEFF);
	var time = moment(rounded).format("h:mm");
	cb(null, "The time is " + time);
}

exports.getTimeOfDay = function(cb) {
	var date = new Date(); 
	var rounded = new Date(Math.round(date.getTime() / COEFF) * COEFF);
	var time = moment(rounded).format("H")
	var tod
	if (time < 12) {
		tod = "morning"
	} else if (time < 17) {
		tod =  "afternoon"
	} else {
		tod =  "night"
	}

	cb(null, tod);
}

exports.getDayOfWeek = function(cb) {
	cb(null, moment().format("dddd"));
}

exports.getMonth = function(cb) {
	cb(null, moment().format("MMMM"));
}

// > object month javascript
// 	var moment = require("moment");
	
// 	var user = this.currentUser();
// 	var msg = this._users[user].orig_message;
// 	var parts = msg.split(" ");

// 	var _ = require("underscore");

// 	if (_.contains(parts, "next")) {
// 		return moment().add('M', 1).format("MMMM");
// 	} else if (_.contains(parts, "previous")) {
// 		return moment().subtract('M', 1).format("MMMM");
// 	} else if (_.contains(parts, "first")) {
// 		return "January";
// 	} else if (_.contains(parts, "last")) {
// 		return "December";
// 	} else {
// 		return moment().format("MMMM");	
// 	}

// < object
// + what month [of the year] is this
// - It is <call>month</call>

// + what is the [next] [previous] [first] [last] month [of the year]
// - It is <call>month</call>

