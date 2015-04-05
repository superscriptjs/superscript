/**

  Import a data file into MongoDB

**/

var fs = require("fs");
var async = require("async");
var _ = require("underscore");
var Utils = require("../utils");
var keepRegex = new RegExp("\{keep\}", "i");
var filterRegex = /\{\s*\^(\w+)\(([\w<>,\s]*)\)\s*\}/i;
var debug = require("debug")("Importer");

module.exports = function(factSystem, Topic, Gambit, Reply) {

  return function(path, callback) {

    var that = this;
    var data = JSON.parse(fs.readFileSync(path, 'utf8'));

    var eachTopicItor = function(topicName, next) {
      debug("Find or create", topicName);
      var properties = {
        name:topicName,
        keep: (data.gTopicFlags[topicName].indexOf('keep') !== -1),
        system: (data.gTopicFlags[topicName].indexOf('system') !== -1),
        keywords: (data.keywords[topicName]) ? data.keywords[topicName] : []
      };

      Topic.findOrCreate({name:topicName}, properties, function(err, topic) {

        var eachGambitItor = function(gambitId, next2) {
          var gambitData = rawToGambitData(gambitId, data.gTopics[topicName][gambitId]);

          topic.createGambit(gambitData, function(err, gambit){
            // add reply

            var itemData = data.gTopics[topicName][gambitId];
            var replyItor = function(replyId, cb) {

              var replyString = itemData.reply[replyId];
              var properties = { id: replyId, reply: itemData.reply[replyId] };

              var match = replyString.match(keepRegex);
              if (match) {
                properties.keep = true;
                properties.reply = Utils.trim(replyString.replace(match[0], ""));
              }

              match = replyString.match(filterRegex);
              if (match) {
                properties.filter = "^" + match[1] + "(" + match[2] + ")";
                properties.reply = Utils.trim(replyString.replace(match[0], ""));
              }

              gambit.addReply(properties, function(err, reply){
                cb();
              });
            };

            async.each(Object.keys(itemData.reply), replyItor, function(err, res){
              next2();
            });

          });
        };

        async.each(Object.keys(data.gTopics[topicName]), eachGambitItor, function(){
          next();
        });
      });
    };

    async.each(Object.keys(data.gTopics), eachTopicItor, function(){

      var eachTopicPrevItor = function(topicName, next) {
        var eachGambitSetPrevItor = function(replyId, next2) {

          Reply.findOne({id:replyId}, function(err, reply) {
            if (reply) {
              var gambitSet = data.gPrevTopics[topicName][replyId];

              var eachGambitPrevItor = function(trigger, next3) {
                createGambit(trigger, gambitSet[trigger], function(err, res){

                  // Add to the replySet.
                  reply.gambits.addToSet(res._id);
                  reply.save(function(){
                    next3();
                  });
                });
              };

              // I want to fetch the reply first
              async.each(Object.keys(gambitSet), eachGambitPrevItor, function(){
                next2();
              });

            } else {
              // No Reply found, lets skip it.
              next2();
            }
          });
        };

        async.each(Object.keys(data.gPrevTopics[topicName]), eachGambitSetPrevItor, function(){
          next();
        });
      };

      async.each(Object.keys(data.gPrevTopics), eachTopicPrevItor, function(){
        console.log("done");
        callback(null, "done");
      });
    });
  };
};


var rawToGambitData = function(gambitId, itemData) {
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

  if (itemData.redirect && itemData.redirect !== "") {
    gambitData.redirect = itemData.redirect;
  }
  return gambitData;
};

var createGambit = function(gambitId, itemData, callback) {
  var gambitData = rawToGambitData(gambitId, itemData);

  Gambit.findOrCreate({id:gambitId}, gambitData, function(err, gambit) {

    var replyItor = function(replyId, cb) {

      // TODO: Replies from the old system could have filter functions here
      // Lets strip them off and pass them in like normal properties

      var replyString = itemData.reply[replyId];
      var properties = { id: replyId, reply: itemData.reply[replyId] };

      var match = replyString.match(keepRegex);
      if (match) {
        properties.keep = true;
        properties.reply = Utils.trim(replyString.replace(match[0], ""));
      }

      match = replyString.match(filterRegex);
      if (match) {
        properties.filter = "^" + match[1] + "(" + match[2] + ")";
        properties.reply = Utils.trim(replyString.replace(match[0], ""));
      }


      Reply.create(properties, function(err,res){
        res.save(function(err){
          var addMe = {$addToSet: {replies: res._id}};
          Gambit.findByIdAndUpdate(gambit._id, addMe, function(err, me) {
            cb();
          });
        });
      });
    };

    async.each(Object.keys(itemData.reply), replyItor, function(err, res){
      gambit.save(callback);
    });

  });
};
