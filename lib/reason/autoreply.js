var debug   = require("debug")("AutoReply");
var async   = require("async");
var _       = require("underscore");
var history = require("../history");
var Utils   = require("../utils");

var numReply = require("./numReply");
var humReply = require("./humReply");
var descReply = require("./descReply");
var entyReply = require("./entyReply");
var locReply = require("./locReply");

//
var abbrReply = function(message, facts, cnet, user, cb) {
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
      case "NUM":   numReply(message, facts, cnet, user, cb); break;
      case "HUM":   humReply(message, facts, cnet, user, cb); break;
      case "DESC":  descReply(message, facts, cnet, user, cb); break;
      case "ENTY":  entyReply(message, facts, cnet, user, cb); break;
      case "LOC":   locReply(message, facts, cnet, user, cb); break;
      case "ABBR":  abbrReply(message, facts, cnet, user, cb); break;
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
  } else {
    // Statement or command
    var gambits = [
      "Okay.",
      "Sure.",
      "Yep.", 
    ];
    debug("Statement", message.raw);
    cb(null, Utils.pickItem(gambits));
  }
};