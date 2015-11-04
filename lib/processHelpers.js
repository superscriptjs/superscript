var Utils = require("./utils");
var debug = require("debug")("ProcessHelpers");
var async = require("async"); 
var wordnet = require("./wordnet");

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


exports.topicSetter = function (reply) {

  // TODO - Topic Setter should have its own property
  var match = reply.match(/\{topic=(.+?)\}/i);
  var giveup = 0;
  var newtopic;

  while (match) {
    giveup++;
    if (giveup >= 50) {
      dWarn("Infinite loop looking for topic tag!");
      break;
    }
    var name = match[1];
    newtopic = name;
    reply = reply.replace(new RegExp("{topic=" + Utils.quotemeta(name) + "}", "ig"), "");
    match = reply.match(/\{topic=(.+?)\}/i); // Look for more
  }
  return [reply, newtopic];
};

exports.parseCustomFunctions = function (reply, plugins, scope, callback) {
  // New Custom Function Handle
  // This matches the Redirect finder above
  var match = reply.match(/\^(\w+)\(([\w<>,\s]*)\)/);

  // We use async to capture multiple matches in the same reply
  return async.whilst(
    function () {
      return match;
    },
    function (cb) {
      // Call Function here

      var main = match[0];
      var pluginName = Utils.trim(match[1]);
      var partsStr = Utils.trim(match[2]);
      var parts = partsStr.split(",");

      var args = [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i] !== "") {
          args.push(parts[i].trim());
        }
      }

      if (plugins[pluginName]) {

        // SubReply is the results of the object coming back
        // TODO. Subreply should be optional and could be undefined, or null
        args.push(function customFunctionHandle(err, subreply) {

          match = false;
          reply = reply.replace(main, subreply);
          match = reply.match(/\^(\w+)\(([~\w<>,\s]*)\)/);
          if (err) {
            cb(err);
          } else {
            cb();
          }
        });

        debug("Calling Plugin Function", pluginName);
        plugins[pluginName].apply(scope, args);

      } else {
        // If a function is missing, we kill the line and return empty handed
        dWarn("Custom Function not-found", pluginName);
        match = false;
        cb(null, "");
      }
    },
    function (err) {
      if (err) {
        callback(null, "");
      } else {
        callback(null, Utils.trim(reply));
      }
    }
  );
};


exports.processAlternates = function (reply) {
  // Reply Alternates.
  var match = reply.match(/\(\((.+?)\)\)/);
  var giveup = 0;
  while (match) {
    debug("Reply has Alternates");

    giveup++;
    if (giveup >= 50) {
      dWarn("Infinite loop when trying to process optionals in trigger!");
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