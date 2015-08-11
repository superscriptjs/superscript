/*globals Gambit */
var Utils = require("../utils");
var regexreply = require("../parse/regexreply");
var debug = require("debug")("Reply");
var dwarn = require("debug")("Reply:Error");
var Sort = require("./sort");
var async = require("async");

module.exports = function (mongoose) {

  var replySchema = new mongoose.Schema({
    id: {type: String, index: true, default: Utils.genId()},
    reply: {type: String, required: "{reply} is required.", trim: true},
    keep: {type: Boolean, default: false },
    filter: {type: String, default: ""},
    parent: { type: String, ref: 'Gambit' },
    
    // Replies could referece other gambits
    // This forms the basis for the 'previous' - These are Children
    gambits: [{ type: String, ref: 'Gambit' }]
  });

  // This method is simular to the topic.findMatch
  replySchema.methods.findMatch = function (message, user, plugins, scope, callback) {
    var eachGambitHandle;
    var eachGambit;
    var self = this;
    var matches = [];
    var filterRegex = /\s*\^(\w+)\(([\w<>,\|\s]*)\)\s*/i;

    eachGambit = function(type, id) {
      // Lets Query for Gambits
      // TODO - Pass in match options

      var execHandle = function(err, mgambits) {
        var populateGambits = function (gambit, cb) {
          Reply.populate(gambit, {path: "replies"}, cb);
        };

        async.each(mgambits.gambits, populateGambits, function populateGambitsComplete (err2) {
          if (err2) {
            console.log(err2);
          }
          async.each(mgambits.gambits, eachGambitHandle, function eachGambitHandleComplete () {
            callback(null, matches);
          });
        });
      };

      if (type === "topic") {
        debug("Looking back Topic", id);
        Topic.findOne({_id: id}, "gambits")
          .populate("gambits")
          .exec(execHandle);
      } else {
        debug("Looking back at Conversation", id);
        Reply.findOne({_id: id}, "gambits")
         .populate("gambits")
         .exec(execHandle);
      }
    };

    // This is the main function that looks for a matching entry
    eachGambitHandle = function (trigger, callback) {

      var match = false;
      var stars = [];

      regexreply.postParse(trigger.trigger, message, user, function complexFunction(regexp) {
        var pattern = new RegExp("^" + regexp + "$", "i");

        debug("Try to match (clean)'" + message.clean + "' against " +
          trigger.trigger + " (" + regexp + ") prevMatch");
        debug("Try to match (lemma)'" + message.lemString + "' against " +
          trigger.trigger + " (" + regexp + ") or prevMatch");

        if (trigger.isQuestion && message.isQuestion) {
          if (trigger.qSubType !== false) {
            // WH, CH, YN TG
            if (message.qSubType === trigger.qSubType) {
              match = message.clean.match(pattern);
              if (!match) {
                match = message.lemString.match(pattern);
              }
            }
            // NUM etc.
            if (message.qtype.indexOf(trigger.qType) !== -1) {
              match = message.clean.match(pattern);
              if (!match) {
                match = message.lemString.match(pattern);
              }
            }
          } else {
            // NUM etc.
            if (message.qtype.indexOf(trigger.qType) !== -1) {
              debug("QType Match", trigger.qType, message.qtype);
              match = message.clean.match(pattern);
              if (!match) {
                match = message.lemString.match(pattern);
              }
            } else if (trigger.qType === false) {
              // Do we have a question?
              match = message.clean.match(pattern);
              if (!match) {
                match = message.lemString.match(pattern);
              }
            }
          }

        } else if (!trigger.isQuestion && !trigger.qType) {
          match = message.clean.match(pattern);
          if (!match) {
            match = message.lemString.match(pattern);
          }
        }

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
              args.push(function customFilterFunctionHandle(err, filterReply) {
                if (err) {
                  console.log(err);
                }

                if (filterReply === "true" || filterReply === true) {
                  debug("filterReply", filterReply);

                  if (trigger.redirect !== "") {
                    debug("Found Redirect Match with reply");
                    Topic.findTriggerByTrigger(trigger.redirect, function (err2, gambit) {
                      if (err2) {
                        console.log(err2);
                      }

                      trigger = gambit;
                      callback();
                    });

                  } else {
                    debug("Found Match with topic Conversation Thread");
                    if (match.length > 1) {
                      for (var j = 1; j < match.length; j++) {
                        if (match[j]) {
                          stars.push(Utils.trim(match[j]));
                        }
                      }
                    }

                    matches.push({stars: stars, trigger: trigger, topic: self.name});
                    callback();
                  }
                } else {
                  debug("filterReply", filterReply);
                  callback();
                }
              });

              debug("Calling Plugin Function", pluginName);
              plugins[pluginName].apply(scope, args);

            } else {
              debug("Custom Filter Function not-found", pluginName);
              callback();
            }
          } else {

            var afterHandle = function (cb) {
              debug("Found Match with topic Conversation Thread");
              if (match.length > 1) {
                for (var j = 1; j < match.length; j++) {
                  if (match[j]) {
                    stars.push(Utils.trim(match[j]));
                  }
                }
              }

              // Tag the message with the found Trigger we matched on
              message.gambitId = trigger._id;
              debug("Updating Message Object with Trigger Match", message.gambitId);
              matches.push({stars: stars, trigger: trigger, topic: self.name});
              cb();
            };

            if (trigger.redirect !== "") {
              debug("Found Redirect Match with reply", trigger);
              Topic.findTriggerByTrigger(trigger.redirect, function (err, gambit) {
                if (err) {
                  console.log(err);
                }

                debug("Redirecting to New Gambit", gambit);
                if (gambit) {
                  trigger = gambit;
                } else {
                  dwarn("Redirect FAILED '", trigger.redirect, "' not-found");
                }

                afterHandle(callback);
              });
            } else {
              afterHandle(callback);
            }
          }
        } else {
          callback();
        }

      }); // end regexReply
    }; // end EachGambit

    eachGambit("reply", self._id);
    
  };

  replySchema.methods.sortGambits = function (callback) {
    var self = this;
    var expandReorder = function (gambitId, cb) {
      Gambit.findById(gambitId, function (err, gambit) {
        cb(err, gambit);
      });
    };

    async.map(this.gambits, expandReorder, function (err, newGambitList) {
      if (err) {
        console.log(err);
      }

      var newList = Sort.sortTriggerSet(newGambitList);
      self.gambits = newList.map(function (g) {
        return g._id;
      });
      self.save(callback);
    });
  };
  try {
    return mongoose.model("Reply", replySchema);
  } catch(e) {
    return mongoose.model("Reply");
  }
};
