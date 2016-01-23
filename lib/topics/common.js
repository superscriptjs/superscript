/* global Reply, Gambit, Topic */

// These are shared helpers for the models.

var async = require("async");
var debug = require("debug")("Common");
var regexreply = require("ss-parser/lib/regexreply");
var Utils = require("../utils");
var _ = require("lodash");

var _walkReplyParent = function (repId, replyIds, cb) {
  Reply.findById(repId)
    .populate("parent")
    .exec(function (err, reply) {
      if (err) {
        console.log(err);
      }

      if (reply) {
        replyIds.push(reply._id);

        if (reply.parent.parent) {
          _walkReplyParent(reply.parent.parent, replyIds, cb);
        } else {
          cb(null, replyIds);
        }
      } else {
        cb(null, replyIds);
      }
    });
};

exports.walkReplyParent = function (repId, cb) {
  _walkReplyParent(repId, [], cb);
};


var _walkGambitParent = function (gambitId, gambitIds, cb) {
  Gambit.findOne({_id: gambitId})
    .populate("parent")
    .exec(function (err, gambit) {
      if (err) {
        console.log(err);
      }

      if (gambit) {
        gambitIds.push(gambit._id);
        if (gambit.parent && gambit.parent.parent) {
          _walkGambitParent(gambit.parent.parent, gambitIds, cb);
        } else {
          cb(null, gambitIds);
        }
      } else {
        cb(null, gambitIds);
      }
    });
};

exports.walkGambitParent = function (gambitId, cb) {
  _walkGambitParent(gambitId, [], cb);
};


// This will find all the gambits to process by parent (topic or conversation)
exports.eachGambit = function (type, id, options, callback) {
  // Lets Query for Gambits

  var execHandle = function (err, mgambits) {

    if (err) {
      console.log(err);
    }

    var populateGambits = function (gambit, cb) {
      Reply.populate(gambit, {path: "replies"}, cb);
    };

    async.each(mgambits.gambits, populateGambits, function populateGambitsComplete(err2) {
      if (err2) {
        console.log(err2);
      }
      async.map(mgambits.gambits, _eachGambitHandle(options),
        function eachGambitHandleComplete(err3, matches) {
          callback(null, _.flatten(matches));
        }
      );
    });
  };

  if (type === "topic") {
    debug("Looking back Topic", id);
    Topic.findOne({_id: id}, "gambits")
      .populate({path: "gambits", match: {isCondition: false }})
      .exec(execHandle);
  } else if (type === "reply") {
    debug("Looking back at Conversation", id);
    Reply.findOne({_id: id}, "gambits")
      .populate({path: "gambits", match: {isCondition: false }})
      .exec(execHandle);
  } else if (type === "condition") {
    debug("Looking back at Conditions", id);
    Condition.findOne({_id: id}, "gambits")
      .populate("gambits")
      .exec(execHandle);
  } else {
    debug("We should never get here");
    callback(true);
  }
};

var _afterHandle = function (match, matches, trigger, topic, cb) {
  debug("Match found", trigger, match);
  var stars = [];
  if (match.length > 1) {
    for (var j = 1; j < match.length; j++) {
      if (match[j]) {
        stars.push(Utils.trim(match[j]));
      }
    }
  }

  var data = {stars: stars, trigger: trigger };
  if (topic !== "reply") {
    data.topic = topic;
  }

  matches.push(data);
  cb(null, matches);
};

var _doesMatch = function(trigger, message, user, callback) {

  var match = false;

  regexreply.postParse(trigger.trigger, message, user, function complexFunction(regexp) {
    var pattern = new RegExp("^" + regexp + "$", "i");

    debug("Try to match (clean)'" + message.clean + "' against " + trigger.trigger + " (" + regexp + ")");
    debug("Try to match (lemma)'" + message.lemString + "' against " + trigger.trigger + " (" + regexp + ")");

    // Match on the question type (qtype / qsubtype)
    if (trigger.isQuestion && message.isQuestion) {

      if (_.isEmpty(trigger.qSubType) && _.isEmpty(trigger.qType) && message.isQuestion === true) {
        match = message.clean.match(pattern);
        if (!match) {
          match = message.lemString.match(pattern);
        }
      } else {
        if ((!_.isEmpty(trigger.qType) && message.qtype.indexOf(trigger.qType) !== -1) ||
          message.qSubType === trigger.qSubType) {
          match = message.clean.match(pattern);
          if (!match) {
            match = message.lemString.match(pattern);
          }
        }
      }
    } else {
      // This is a normal match
      if (trigger.isQuestion === false) {
        match = message.clean.match(pattern);
        if (!match) {
          match = message.lemString.match(pattern);
        }
      }
    }

    callback(null, match);
  });
};

exports.doesMatch = _doesMatch;

// This is the main function that looks for a matching entry
var _eachGambitHandle = function (options) {
  var filterRegex = /\s*\^(\w+)\(([\w<>,\|\s]*)\)\s*/i;

  return function (trigger, callback) {

    var match = false;
    var matches = [];

    var message = options.message;
    var user = options.user;
    var plugins = options.plugins;
    var scope = options.scope;
    var topic = options.topic || "reply";

    _doesMatch(trigger, message, user, function (err, match) {

      if (match) {
        if (trigger.filter !== "") {
          // We need scope and functions
          debug("We have a filter function", trigger.filter);

          var filterFunction = trigger.filter.match(filterRegex);
          debug("Filter Function Found", filterFunction);

          var pluginName = Utils.trim(filterFunction[1]);
          var partsStr = Utils.trim(filterFunction[2]);
          var parts = partsStr.split(",");

          var args = [];
          for (var i = 0; i < parts.length; i++) {
            if (parts[i] !== "") {
              args.push(parts[i].trim());
            }
          }

          if (plugins[pluginName]) {

            var filterScope = scope;
            filterScope.message = options.localOptions.message;
            filterScope.message_props = options.localOptions.messageScope;
            filterScope.user = options.localOptions.user;

            args.push(function customFilterFunctionHandle(err, filterReply) {
              if (err) {
                console.log(err);
              }

              if (filterReply === "true" || filterReply === true) {
                debug("filterReply", filterReply);

                if (trigger.redirect !== "") {
                  debug("Found Redirect Match with topic " + topic);
                  Topic.findTriggerByTrigger(trigger.redirect, function (err2, gambit) {
                    if (err2) {
                      console.log(err2);
                    }

                    trigger = gambit;
                    callback(null, matches);
                  });

                } else {
                  // Tag the message with the found Trigger we matched on
                  message.gambitId = trigger._id;
                  _afterHandle(match, matches, trigger, topic, callback);
                }
              } else {
                debug("filterReply", filterReply);
                callback(null, matches);
              }
            });

            debug("Calling Plugin Function", pluginName);
            plugins[pluginName].apply(filterScope, args);

          } else {
            debug("Custom Filter Function not-found", pluginName);
            callback(null, matches);
          }
        } else {

          if (trigger.redirect !== "") {
            debug("Found Redirect Match with topic");
            Topic.findTriggerByTrigger(trigger.redirect, function (err, gambit) {
              if (err) {
                console.log(err);
              }

              debug("Redirecting to New Gambit", gambit);
              trigger = gambit;
              // Tag the message with the found Trigger we matched on
              message.gambitId = trigger._id;
              _afterHandle(match, matches, trigger, topic, callback);
            });
          } else {
            // Tag the message with the found Trigger we matched on
            message.gambitId = trigger._id;
            _afterHandle(match, matches, trigger, topic, callback);
          }
        }
      } else {
        callback(null, matches);
      }

    }); // end regexReply
  }; // end EachGambit
};
