var debug   = require("debug")("AutoReply");
var async   = require("async");
var _       = require("underscore");
var history = require("../history");
var Utils   = require("../utils");

var isa     = require("./isaLookup");
var roman   = require('roman-numerals');

var numReply = require("./numReply");
var humReply = require("./humReply");
var descReply = require("./descReply");
var entyReply = require("./entyReply");
var locReply = require("./locReply");

//
var abbrReply = function(message, user, cb) {
  cb(null, "Bill Cosby");
}

module.exports = function(message, user, facts, cnet, cb) {
  var suggestedReply = "";

  if (message.isQuestion) {
    debug("Question Type", message.qtype, message.qSubType);

    var parts = message.qtype.split(":");
    var course = parts[0];
    var fine = parts[1];

    debug("Course / Fine", course, fine);

    switch (course) {
      case "NUM":   suggestedReply = numReply(message, user, cb); break;
      case "HUM":   suggestedReply = humReply(message, user, cb); break;
      case "DESC":  suggestedReply = descReply(message, user, cb); break;
      case "ENTY":  suggestedReply = entyReply(message, user, cb); break;
      case "LOC":   suggestedReply = locReply(message, user, cb); break;
      case "ABBR":  suggestedReply = abbrReply(message, user, cb); break;
      default: 
        debug("Fall though all QTypes");
        // We have a question with no type / subtype
        // IE: Is snow cold?
        if (message.nouns.length == 1 && (message.adjectives.length == 1)) {
          if (message.names.length == 1) {
            debug("TODO - History lookup for " + message.names[0]);
            // var candidates = history(user, { names: message.names});
            cb(null, "");
          } else {

            // Resolve this
            var t1 = message.concepts[1].text;
            var t2 = message.concepts[2].text;

            cnet.resolveFact(t1, t2, function(err, res){
              if (res) {
                cb(null, "It sure is.");
              } else {
                cb(null, "Not sure.");
              }
            });
          }
        } else {
          cb(null, "");
        }
      // End Default
    }
    // This should actually not get called because all the xxxReply hit the CB.
    cb(null, suggestedReply);
  } else {
    // Statement or command
    var gambits = [
      "Okay.",
      "Sure.",
      "Yep.", 
    ];
    debug("Statement", message);
    cb(null, Utils.pickItem(gambits));
  }
};