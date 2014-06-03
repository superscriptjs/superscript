var debug 	= require("debug")("AutoReply");


/*
	AutoReply tries to reply to most common things based on the question type.

  Class	Definition
  ABBREVIATION	abbreviation
    abb	abbreviation
    exp	expression abbreviated
  ENTITY	entities
    animal	animals
    body	organs of body
    color	colors
    creative	inventions, books and other creative pieces
    currency	currency names
    dis.med.	diseases and medicine
    event	events
    food	food
    instrument	musical instrument
    lang	languages
    letter	letters like a-z
    other	other entities
    plant	plants
    product	products
    religion	religions
    sport	sports
    substance	elements and substances
    symbol	symbols and signs
    technique	techniques and methods
    term	equivalent terms
    vehicle	vehicles
    word	words with a special property
  DESCRIPTION	description and abstract concepts
    definition	definition of sth.
    description	description of sth.
    manner	manner of an action
    reason	reasons
  HUMAN	human beings
    group	a group or organization of persons
    ind	an individual
    title	title of a person
    description	description of a person
  LOCATION	locations
    city	cities
    country	countries
    mountain	mountains
    other	other locations
    state	states
  NUMERIC	numeric values
    code	postcodes or other codes
    count	number of sth.
    date	dates
    distance	linear measures
    money	prices
    order	ranks
    other	other numbers
    period	the lasting time of sth.
    percent	fractions
    speed	speed
    temp	temperature
    size	size, area and volume
    weight
*/

var numReply = function(message, user) {

  var parts = message.qtype.split(":");
  var fine = parts[1];

  var suggest = "";

  switch (fine) {
    case "code": suggest = "I'm not sure what the phone number is"; break;
    case "count":  suggest = "42"; break;
    case "date": suggest = "May 2, 2012"; break;
    case "distance":  suggest = "42 feet"; break;
    case "money": suggest = "20 bucks"; break;
    case "order": break;
    case "other": break;
    case "period":  break;
    case "percent": suggest = "42 percent or more";  break;
    case "speed":  suggest = "42km per hour"; break;
    case "temp":  suggest = "42 degrees"; break;
    case "size":  suggest = "42 inches"; break;
    case "weight":  suggest = "42lbs"; break;
  }

  return suggest;
}

var humReply = function(message, user) {
  return "Bill Cosby";
}

var descReply = function(message, user) {
  return "No idea";
}

var abbrReply = function(message, user) {
  return "Bill Cosby";
}

var entyReply = function(message, user) {
  return "Pixxa";
}

var locReply = function(message, user) {
  return "Vancouver BC.";
}

module.exports = function(message, user, cb) {
	var suggestedReply = "";

	if (message.isQuestion) {
		debug("Question Type", message.qtype, message.qSubType);

		var parts = message.qtype.split(":");
		var course = parts[0];
		var fine = parts[1];

		debug("Course / Fine", course, fine);

		switch (course) {
			case "NUM": 	suggestedReply = numReply(message, user); break;
			case "HUM": 	suggestedReply = humReply(message, user); break;
			case "DESC": 	suggestedReply = descReply(message, user); break;
			case "ENTY": 	suggestedReply = entyReply(message, user); break;
			case "ABBR": 	suggestedReply = abbrReply(message, user);break;
			case "LOC": 	suggestedReply = locReply(message, user);break;
		}
	}

  debug("Suggesting", suggestedReply);
	cb(null, suggestedReply);

};

