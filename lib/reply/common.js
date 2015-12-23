var Utils = require("../utils");
var wordnet = require("./wordnet");
var debug = require("debug")("ProcessHelpers");

exports.getTopic = function (topicsSystem, name, cb) {
  topicsSystem.topic.findOne({name: name}, function(err, topicData) {
    if (!topicData) {
      cb(new Error("No Topic Found"));
    } else {
      debug("Getting Topic Data for", topicData);
      cb(err, {id: topicData._id, name: name, type: "TOPIC"});
    }
  });
};

// TODO - Topic Setter should have its own property
exports.topicSetter = function (reply) {

  var TOPIC_REGEX = /\{topic=(.+?)\}/i;

  var match = reply.match(TOPIC_REGEX);
  var giveup = 0;
  var newtopic;

  while (match) {
    giveup++;
    if (giveup >= 50) {
      debug("Infinite loop looking for topic tag!");
      break;
    }
    var name = match[1];
    newtopic = name;
    reply = reply.replace(new RegExp("{topic=" + Utils.quotemeta(name) + "}", "ig"), "");
    match = reply.match(TOPIC_REGEX); // Look for more
  }
  debug("New Topic", newtopic);
  return [reply, newtopic];
};

exports.processAlternates = function (reply) {
  // Reply Alternates.
  var match = reply.match(/\(\((.+?)\)\)/);
  var giveup = 0;
  while (match) {
    debug("Reply has Alternates");

    giveup++;
    if (giveup >= 50) {
      debug("Infinite loop when trying to process optionals in trigger!");
      return "";
    }

    var parts = match[1].split("|");
    var opts = [];
    for (var i = 0; i < parts.length; i++) {
      opts.push(parts[i].trim());
    }

    var resp = Utils.getRandomInt(0, opts.length - 1);
    reply = reply.replace(new RegExp("\\(\\(\\s*" + Utils.quotemeta(match[1]) + "\\s*\\)\\)"), opts[resp]);
    match = reply.match(/\(\((.+?)\)\)/);
  }

  return reply;
};

// Handle WordNet in Replies
exports.wordnetReplace = function (match, sym, word, p3, offset, done) {
  wordnet.lookup(word, sym, function (err, words) {
    if (err) {
      console.log(err);
    }

    words = words.map(function (item) {
      return item.replace(/_/g, " ");
    });
    debug("Wordnet Replies", words);
    var resp = Utils.pickItem(words);
    done(null, resp);
  });
};

var KEYVALG_REGEX = new RegExp("\s*([a-z0-9]{2,20})\s*=\s*([a-z0-9\'\"]{2,20})\s*", "ig");
var KEYVALI_REGEX = new RegExp("\s*([a-z0-9]{2,20})\s*=\s*([a-z0-9\'\"]{2,20})\s*", "i");
exports.addStateData = function(data) {
  // Do something with the state
  var items = data.match(KEYVALG_REGEX);
  
  for (var i = 0; i < items.length; i++) {
    console.log("!!" + items[i] + "!!", items[i].match(KEYVALI_REGEX));
  }
}
