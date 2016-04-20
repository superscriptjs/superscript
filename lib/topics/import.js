/**

  Import a data file into MongoDB

**/

var fs = require("fs");
var async = require("async");
var _ = require("lodash");
var Utils = require("../utils");
var debug = require("debug-levels")("SS:Importer");

var KEEP_REGEX = new RegExp("\{keep\}", "i");
var FILTER_REGEX = /\{\s*\^(\w+)\(([\w<>,\s]*)\)\s*\}/i;

module.exports = function (factSystem, Topic, Gambit, Reply) {

  var _rawToGambitData = function (gambitId, itemData) {

    var gambitData = {
      id: gambitId,
      isQuestion: itemData.options.isQuestion,
      isCondition: itemData.options.isConditional,
      qType: itemData.options.qType === false ? "" : itemData.options.qType,
      qSubType: itemData.options.qSubType === false ? "" : itemData.options.qSubType,
      filter: itemData.options.filter === false ? "" : itemData.options.filter,
      trigger: itemData.trigger
    };

    // This is to capture anything pre 5.1
    if (itemData.raw) {
      gambitData.input = itemData.raw;
    } else {
      gambitData.input = itemData.trigger;
    }

    if (itemData.redirect !== null) {
      gambitData.redirect = itemData.redirect;
    }

    return gambitData;
  };

  var importData = function (data, callback, flushTopics, preserveRandom) {

    var gambitsWithConversation = [];

    var eachReplyItor = function (gambit) {
      return function (replyId, nextReply) {
        debug.verbose("Reply process: " + replyId);
        var replyString = data.replys[replyId];
        var properties = { id: replyId, reply: replyString, parent: gambit._id };
        var match = properties.reply.match(KEEP_REGEX);
        if (match) {
          properties.keep = true;
          properties.reply = Utils.trim(properties.reply.replace(match[0], ""));
        }
        match = properties.reply.match(FILTER_REGEX);
        if (match) {
          properties.filter = "^" + match[1] + "(" + match[2] + ")";
          properties.reply = Utils.trim(properties.reply.replace(match[0], ""));
        }

        gambit.addReply(properties, function (err) {
          if (err) {
            console.log(err);
          }
          nextReply();
        });
      };
    };

    var findOrCreateTopic = function (topicName, properties, callback) {
      Topic.findOrCreate({name: topicName}, properties, function (err, topic) {
        if (flushTopics && !(topicName === 'random' && preserveRandom)) {
          topic.clearGambits(function() {
            Topic.remove({ _id: topic.id }, function (err2) {
              if (err2) {
                console.log(err);
              }

              debug.verbose('removed topic ' + topicName + ' (' + topic.id + ')');

              Topic.findOrCreate({name: topicName}, properties, function (err3, topic2) {
                callback(err3, topic2);
              });
            });
          });
        } else {
          callback(err, topic);
        }
      });
    };

    var eachTopicItor = function (topicName, nextTopic) {
      debug.verbose("Find or create", topicName);
      var properties = {
        name: topicName,
        keep: data.topics[topicName].flags.indexOf("keep") !== -1,
        nostay: data.topics[topicName].flags.indexOf("nostay") !== -1,
        system: data.topics[topicName].flags.indexOf("system") !== -1,
        keywords: data.topics[topicName].keywords ? data.topics[topicName].keywords : [],
        filter: (data.topics[topicName].filter) ? data.topics[topicName].filter : ""
      };

      findOrCreateTopic(topicName, properties, function (err, topic) {
        if (err) {
          console.log(err);
        }

        var eachGambitItor = function (gambitId, nextGambit) {
          if (!_.isUndefined(data.gambits[gambitId].options.conversations)) {
            gambitsWithConversation.push(gambitId);
            nextGambit();

          } else if (data.gambits[gambitId].topic === topicName) {
            debug.verbose("Gambit process: " + gambitId);
            var gambitRawData = data.gambits[gambitId];
            var gambitData = _rawToGambitData(gambitId, gambitRawData);

            topic.createGambit(gambitData, function (err3, gambit) {
              if (err3) {
                return new Error(err3);
              }
              async.eachSeries(gambitRawData.replys, eachReplyItor(gambit), function (err4) {
                if (err4) {
                  return new Error(err4);
                }
                nextGambit();
              });
            });
          } else {
            nextGambit();
          }
        };

        async.eachSeries(Object.keys(data.gambits), eachGambitItor, function (err5) {
          if (err5) {
            console.log(err5);
          }
          debug.verbose("All gambits for " + topicName + " processed.");

          nextTopic();
        });
      });
    };

    var eachConvItor = function (gambitId) {
      return function (replyId, nextConv) {
        debug.verbose("conversation/reply: " + replyId);
        Reply.findOne({id: replyId}, function (err, reply) {
          if (err) {
            console.log(err);
          }
          if (reply) {
            reply.gambits.addToSet(gambitId);
            reply.save(function () {
              reply.sortGambits(function () {
                debug.verbose("All conversations for " + gambitId + " processed.");
                nextConv();
              });
            });
          } else {
            debug.warn("No reply found!");
            nextConv();
          }
        });
      };
    };

    async.eachSeries(Object.keys(data.topics), eachTopicItor, function () {


      async.eachSeries(_.uniq(gambitsWithConversation), function (gambitId, finish) {
        var gambitData = data.gambits[gambitId];

        var conversations = gambitData.options.conversations || [];
        if (conversations.length === 0) {
          return finish();
        }

        var convoGambit = _rawToGambitData(gambitId, gambitData);
        var replyId = conversations[0];

        // TODO??: Add reply.addGambit(...)
        Reply.findOne({id:replyId}, function(err, replyObj) {
          var cGambit = new Gambit(convoGambit);
          async.eachSeries(gambitData.replys, eachReplyItor(cGambit), function (err, res) {
            debug.verbose('All replys processed.');
            cGambit.parent = replyObj._id;
            cGambit.save(function(err, gam){
              debug.verbose("Saving New Gambit", err, gam);
              async.map(conversations, eachConvItor(gam._id), function (err, results) {
                debug.verbose('All conversations for ' + gambitId + ' processed.');
                finish();
              });
            });
          });
        });
      }, function () {

        // Move on to conditions (convos)
        var convoItor = function(convoId, next) {
          var condition = data.convos[convoId];
          Topic.findOne({name: condition.topic}, function(err, topic) {
            topic.createCondition(condition, function(err, condition) {
              next();
            });
          });
        }

        async.eachSeries(Object.keys(data.convos), convoItor, function() {
          debug.verbose("Add Conditions Added");
          callback(null, "done");
        }); // end

      });

    });
  };

  var importFile = function (path, callback) {
    fs.readFile(path, function(err, jsonFile){
      return importData(JSON.parse(jsonFile), callback);
    });
  };

  return {
    file: importFile,
    data: importData
  };
};
