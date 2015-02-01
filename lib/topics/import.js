/**

  Import a data file into MongoDB

**/

var fs = require("fs");
var async = require("async");
var _ = require("underscore");
var facts = require("sfacts");
var Topic = require("./topic");

module.exports = function(factSystem) {
  
  var factSystem = factSystem || facts.create("systemDB");
  var Gambit = require("./gambit")(factSystem);
  var keepRegex = new RegExp("\{keep\}", "i");
  
  return function(path, callback) {

    var that = this;

    var data = JSON.parse(fs.readFileSync(path, 'utf8'));
    // console.log(data);

    // for (topicName in data.gTopicFlags ) {
    //   // TODO Add in the properties
    //   Topic.findOrCreate({name:topicName}, {}, function(err, topic) {});
    // }

    var eachTopicItor = function(topicName, next) {
      Topic.findOrCreate({name:topicName}, {name:topicName}, function(err, top) {

        // I need the top inside here, so we are closing over it.
        var eachGambitItor = function(gambitId, next2) {
          var itemData = data.gTopics[topicName][gambitId];
          var gambitData = {
            id: gambitId,
            isQuestion: itemData.options.isQuestion,
            qType: itemData.options.qType,
            qSubType: itemData.options.qSubType,
            filter: itemData.options.filter
          };

          // This is to capture anything pre 5.1
          if (gambitData.raw) {
            gambitData['input'] = itemData.raw;
          } else {
            gambitData['trigger'] = itemData.trigger;
          } 
          
          Gambit.findOrCreate({id:gambitId}, gambitData, function(err, gambit) {
            
            // Add the reply to the Gambit
            for (var replyId in itemData.reply) {

              // TODO: Replies from the old system could have filter functions here
              // Lets strip them off and pass them in like normal properties
              
              var replyString = itemData.reply[replyId];
              var properties = { id: replyId, reply: itemData.reply[replyId] };

              var match = replyString.match(keepRegex);
              if (match) {
                properties.keep = true;
                properties.reply = replyString.replace(match[0], "");
              }
            
              gambit.replies.addToSet(properties);

            }
            
            gambit.save(function(err, res){
              // Cycle back and add the gambit to the topic
              top.gambits.addToSet(res._id);
              top.save(function(){
                next2();
              });
            });
          });
        }

        async.each(Object.keys(data.gTopics[topicName]), eachGambitItor, function(){
          next(); 
        });
      });
    }


    async.each(Object.keys(data.gTopics), eachTopicItor, function(){
      callback(null, "done");  
    });    
  }
}