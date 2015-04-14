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


module.exports = function(factSystem, Topic, Gambit, Reply) {

  return function(path, callback) {

    var that = this;
    var data = JSON.parse(fs.readFileSync(path, 'utf8'));
    var gambitsMapDb = {};

    var eachTopicItor = function(topicName, nextTopic) {
      debug("Find or create", topicName);
      var properties = {
        name: topicName,
        keep: (data.topics[topicName].flags.indexOf('keep') !== -1),
        system: (data.topics[topicName].flags.indexOf('system') !== -1),
        keywords: (data.topics[topicName].keywords) ? data.topics[topicName].keywords : []
      };

      Topic.findOrCreate({name:topicName}, properties, function(err, topic) {
        debug('topic processed.');

        var eachGambitItor = function(gambitId, nextGambit) {
          if(data.gambits[gambitId].topic === topicName) {
            debug('Gambit process: ' + gambitId);
            var gambitRawData = data.gambits[gambitId];
            var gambitData = _rawToGambitData(gambitId, gambitRawData);

            topic.createGambit(gambitData, function(err, gambit) {
              if(err) return new Error(err);
              debug('Gambit processed.');
              gambitsMapDb[gambitId] = gambit._id;

              var eachReplyItor = function(replyId, nextReply) {
                debug('Reply process: ' + replyId);
                var replyString = data.replys[replyId];
                var properties = { id: replyId, reply: replyString };
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
                gambit.addReply(properties, function(err, reply){
                  debug('Reply processed.');
                  nextReply();
                });
              };

              async.eachSeries(gambitRawData.replys, eachReplyItor, function(err, res){
                debug('All replys processed.');
                nextGambit();
              });

            });
          } else {
            nextGambit();
          }
        };

        async.eachSeries(Object.keys(data.gambits), eachGambitItor, function(err, res){
          debug('All gambits for \'' + topicName + '\' processed.');
          nextTopic();
        });
      });
    };

    var eachConvItor = function(gambitId){
      return function(replyId, nextConv) {
        debug('conversation/reply: ' + replyId);
        Reply.findOne({id:replyId}, function(err, reply) {
          if (reply) {
            reply.gambits.addToSet(gambitsMapDb[gambitId]);
            reply.save(function(){
              nextConv();
            });
          } else {
            debugWarning('No reply found!');
            nextConv();
          }
        });
      }
    };

    async.eachSeries(Object.keys(data.topics), eachTopicItor, function() {
      debug('Now process Conversations');
      async.each(Object.keys(data.gambits), function(gambitId, finish) {
        var gambitData = data.gambits[gambitId];
        var conversations = gambitData.options.conversations || [];
        if(conversations.length === 0) return finish();
        async.each(conversations, eachConvItor(gambitId), function(){
          debug('All conversations for ' + gambitId + ' processed.');
          finish();
        });
      }, function(){
        callback(null, "done");
      });
    });
  };
};


var _rawToGambitData = function(gambitId, itemData) {
  var gambitData = {
    id: gambitId,
    isQuestion: itemData.options.isQuestion,
    qType: (itemData.options.qType === false)? "" : itemData.options.qType,
    qSubType: (itemData.options.qSubType === false) ? "" : itemData.options.qSubType,
    filter: (itemData.options.filter === false) ? "" : itemData.options.filter
  };

  // This is to capture anything pre 5.1
  if (itemData.raw) {
    gambitData.input = itemData.raw;
  } else {
    gambitData.input = itemData.trigger;
    gambitData.trigger = itemData.trigger;
  }

  if (itemData.redirect !== null)  gambitData.redirect = itemData.redirect;
  return gambitData;
};

