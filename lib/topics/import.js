/**

  Import a data file into MongoDB

**/

var fs = require("fs");
var async = require("async");
var _ = require("underscore");
var keepRegex = new RegExp("\{keep\}", "i");
var Reply = require("./reply");

module.exports = function(factSystem, Topic, Gambit) {
    
  return function(path, callback) {

    var that = this;
    var data = JSON.parse(fs.readFileSync(path, 'utf8'));

    // for (topicName in data.gTopicFlags ) {
    //   // TODO Add in the properties
    //   Topic.findOrCreate({name:topicName}, {}, function(err, topic) {});
    // }

    var eachTopicItor = function(topicName, next) {
      Topic.findOrCreate({name:topicName}, {name:topicName}, function(err, top) {

        // I need the top inside here, so we are closing over it.
        var eachGambitItor = function(gambitId, next2) {
          var itemData = data.gTopics[topicName][gambitId];
          createGambit(gambitId, itemData, function(err, res){
            // Cycle back and add the gambit to the topic
            top.gambits.addToSet(res._id);
            top.save(function(){
              next2();
            });
          });
        }

        async.each(Object.keys(data.gTopics[topicName]), eachGambitItor, function(){
          next(); 
        });
      });
    }

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
              }

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
  }
}

var createGambit = function(gambitId, itemData, callback) {
  var gambitData = {
    id: gambitId,
    isQuestion: itemData.options.isQuestion,
    qType: (itemData.options.qType === false)? "" : itemData.options.qType,
    qSubType: (itemData.options.qSubType === false) ? "" : itemData.options.qSubType,
    filter: (itemData.options.filter === false) ? "" : itemData.options.filter
  };

  // This is to capture anything pre 5.1
  if (gambitData.raw) {
    gambitData['input'] = itemData.raw;
  } else {
    gambitData['input'] = itemData.trigger;
    gambitData['trigger'] = itemData.trigger;
  } 

  if (itemData.redirect && itemData.redirect != "") {
    gambitData['redirect'] = itemData.redirect;
  }
  
  Gambit.findOrCreate({id:gambitId}, gambitData, function(err, gambit) {
    
    var replyItor = function(replyId, cb) {

      // TODO: Replies from the old system could have filter functions here
      // Lets strip them off and pass them in like normal properties

      var replyString = itemData.reply[replyId];
      var properties = { id: replyId, reply: itemData.reply[replyId] };

      var match = replyString.match(keepRegex);
      if (match) {
        properties.keep = true;
        properties.reply = replyString.replace(match[0], "");
      }
      
      Reply.create(properties, function(err,res){
        gambit.replies.addToSet(res._id);
        cb();
      });
    }

    async.each(Object.keys(itemData.reply), replyItor, function(err, res){
      gambit.save(callback);
    });

  });
}