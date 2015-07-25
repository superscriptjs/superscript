/**

  Import a data file into MongoDB

**/

var fs = require("fs");
var async = require("async");
var _ = require("underscore");
var Utils = require("../utils");
var debug = require("debug")("Importer");
var debugWarning = require("debug")("Importer:Warning");

var KEEP_REGEX = new RegExp("\{keep\}", "i");
var FILTER_REGEX = /\{\s*\^(\w+)\(([\w<>,\s]*)\)\s*\}/i;

module.exports = function (factSystem, Topic, Gambit, Reply) {


  var _rawToGambitData = function (gambitId, itemData) {
    var gambitData = {
      id: gambitId,
      isQuestion: itemData.options.isQuestion,
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
        debug("Reply process: " + replyId);
        var replyString = data.replys[replyId];
        var properties = { id: replyId, reply: replyString};
        var match = replyString.match(KEEP_REGEX);
        if (match) {
          properties.keep = true;
          properties.reply = Utils.trim(replyString.replace(match[0], ""));
        }
        match = replyString.match(FILTER_REGEX);
        if (match) {
          properties.filter = "^" + match[1] + "(" + match[2] + ")";
          properties.reply = Utils.trim(replyString.replace(match[0], ""));
        }
        gambit.addReply(properties, function (err) {
          if (err) {
            console.log(err);
          }

          debug("Reply processed.");
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

              debug('removed topic ' + topicName + ' (' + topic.id + ')');

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
      debug("Find or create", topicName);
      var properties = {
        name: topicName,
        keep: data.topics[topicName].flags.indexOf("keep") !== -1,
        system: data.topics[topicName].flags.indexOf("system") !== -1,
        keywords: data.topics[topicName].keywords ? data.topics[topicName].keywords : []
      };

      findOrCreateTopic(topicName, properties, function (err, topic) {
        if (err) {
          console.log(err);
        }

        debug("topic processed.");

        var eachGambitItor = function (gambitId, nextGambit) {
          if (!_.isUndefined(data.gambits[gambitId].options.conversations)) {

            gambitsWithConversation.push(gambitId);
            nextGambit();

          } else if (data.gambits[gambitId].topic === topicName) {
            debug("Gambit process: " + gambitId);
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
                debug("All replys processed.");
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
          debug("All gambits for " + topicName + " processed.");
          nextTopic();
        });
      });
    };

    var eachConvItor = function (gambitId) {
      return function (replyId, nextConv) {
        debug("conversation/reply: " + replyId);
        Reply.findOne({id: replyId}, function (err, reply) {
          if (err) {
            console.log(err);
          }
          if (reply) {
            reply.gambits.addToSet(gambitId);
            reply.save(function () {
              reply.sortGambits(function () {
                debug("All conversations for " + gambitId + " processed.");
                nextConv();
              });
            });
          } else {
            debugWarning("No reply found!");
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
        var cGambit = new Gambit(convoGambit);

        async.eachSeries(gambitData.replys, eachReplyItor(cGambit), function () {
          debug("All replys processed.");
          cGambit.save(function (err, gam) {
            debug("Saving New Gambit", err, gam);
            async.map(conversations, eachConvItor(gam._id), function () {
              debug("All conversations for " + gambitId + " processed.");
              finish();
            });
          });
        });
      }, function () {
        callback(null, "done");
      });
    });
  };

  var importFile = function (path, callback) {

      var fs = require('fs');

      fs.readFile(path, function(err, jsonFile){
          //var data = JSON.parse(jsonFile);
          return importData(JSON.parse(jsonFile), callback);
      });
  };

  return {
    file: importFile,
    data: importData
  };
};
