// These are shared helpers for the models.

var async = require("async");
var debug = require("debug-levels")("SS:Common");
var postParse = require("../postParse");
var Utils = require("../utils");
var _ = require("lodash");

module.exports = function(mongoose) {
    var getReply = function() { return mongoose.model('Reply'); };
    var getGambit = function() { return mongoose.model('Gambit'); };
    var getCondition = function() { return mongoose.model('Condition'); };
    var getTopic = function() { return mongoose.model('Topic'); };

    var _walkReplyParent = function (repId, replyIds, cb) {
        getReply().findById(repId)
        .populate("parent")
        .exec(function (err, reply) {
            if (err) {
                debug.error(err);
            }


            debug.info("Walk", reply);

            if (reply) {
                replyIds.push(reply._id);

                if (reply.parent && reply.parent.parent) {
                    _walkReplyParent(reply.parent.parent, replyIds, cb);
                } else {
                    cb(null, replyIds);
                }
            } else {
                cb(null, replyIds);
            }
        });
    };

    var _walkGambitParent = function (gambitId, gambitIds, cb) {
        getGambit().findOne({_id: gambitId})
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

    // This will find all the gambits to process by parent (topic or conversation)
    var eachGambit = function (type, id, options, callback) {
        // Lets Query for Gambits

        var execHandle = function (err, mgambits) {

            if (err) {
                console.log(err);
            }

            var populateGambits = function (gambit, cb) {
                getReply().populate(gambit, {path: "replies"}, cb);
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
            debug.verbose("Looking back Topic", id);
            getTopic().findOne({_id: id}, "gambits")
            .populate({path: "gambits", match: {isCondition: false }})
            .exec(execHandle);
        } else if (type === "reply") {
            debug.verbose("Looking back at Conversation", id);
            getReply().findOne({_id: id}, "gambits")
            .populate({path: "gambits", match: {isCondition: false }})
            .exec(execHandle);
        } else if (type === "condition") {
            debug.verbose("Looking back at Conditions", id);
            getCondition().findOne({_id: id}, "gambits")
            .populate("gambits")
            .exec(execHandle);
        } else {
            debug.verbose("We should never get here");
            callback(true);
        }
    };

    var _afterHandle = function (match, matches, trigger, topic, cb) {
        debug.verbose("Match found", trigger, match);
        debug.info("Match found '" + trigger.input + "' in topic '" + topic + "'");
        var stars = [];
        if (match.length > 1) {
            for (var j = 1; j < match.length; j++) {
                if (match[j]) {
                    var starData = Utils.trim(match[j]);
                    // Concepts are not allowed to be stars or captured input.
                    starData = (starData[0] == "~") ? starData.substr(1) : starData;
                    stars.push(starData);
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

        postParse.postParse(trigger.trigger, message, user, function complexFunction(regexp) {
            var pattern = new RegExp("^" + regexp + "$", "i");

            debug.verbose("Try to match (clean)'" + message.clean + "' against " + trigger.trigger + " (" + regexp + ")");
            debug.verbose("Try to match (lemma)'" + message.lemString + "' against " + trigger.trigger + " (" + regexp + ")");

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
                            debug.verbose("We have a filter function", trigger.filter);

                            var filterFunction = trigger.filter.match(filterRegex);
                            debug.verbose("Filter Function Found", filterFunction);

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
                                        debug.verbose("filterReply", filterReply);

                                        if (trigger.redirect !== "") {
                                            debug.verbose("Found Redirect Match with topic " + topic);
                                            getTopic().findTriggerByTrigger(trigger.redirect, function (err2, gambit) {
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
                                        debug.verbose("filterReply", filterReply);
                                        callback(null, matches);
                                    }
                                });

                                debug.verbose("Calling Plugin Function", pluginName);
                                plugins[pluginName].apply(filterScope, args);

                            } else {
                                debug.verbose("Custom Filter Function not-found", pluginName);
                                callback(null, matches);
                            }
                        } else {

                            if (trigger.redirect !== "") {
                                debug.verbose("Found Redirect Match with topic");
                                getTopic().findTriggerByTrigger(trigger.redirect, function (err, gambit) {
                                    if (err) {
                                        console.log(err);
                                    }

                                    debug.verbose("Redirecting to New Gambit", gambit);
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

        return {
            walkReplyParent: function (repId, cb) {
                _walkReplyParent(repId, [], cb);
            },
            walkGambitParent: function (gambitId, cb) {
                _walkGambitParent(gambitId, [], cb);
            },
            eachGambit: eachGambit,
            doesMatch: _doesMatch
        };

}; //end export
