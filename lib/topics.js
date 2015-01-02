var _ = require("underscore");
var debug = require("debug")("Topics");
var Topic = require("./topic");

var natural = require('natural');
var TfIdf = natural.TfIdf;
natural.PorterStemmer.attach();



var Topics = function(data) {
  var that = this;
  this.topics = [];

  if (data.keywords) {
    this.tfidf = new TfIdf(JSON.parse(data.keywords));
  } else {
    this.tfidf = new TfIdf();
  }
  
  _.each(Object.keys(data.gTopics), function(topicName) {
    var topicFlags = data.gTopicFlags[topicName];
    var triggers =  data.gTopics[topicName];
    var previous =  data.gPrevTopics[topicName];

    var sorted = {
      topics: data.gSorted.topics[topicName],
      previous: data.gSorted.thats[topicName],
      prevTrig: data.gSorted.that_trig[topicName]
    };

    that.topics.push(new Topic(topicName, triggers, topicFlags, previous, sorted));
  });
}

// This will become more of a discovery system in the new topicSystem
Topics.prototype.findPendingTopicsForUser = function(user, msg, callback) {

  var that = this;
  var aTopics = [];
  var docs = [];
  this.tfidf.tfidfs(msg.lemString.tokenizeAndStem(), function(i,m,k){
    docs.push({topic:k,score:m});
  });

  var topicOrder = _.sortBy(docs, 'score').reverse();
  // All topics with keywords.. we may have topics with new keywords? like random
  var allTopics = _.map(topicOrder, function(item, val){ return item.topic; });
  var currentTopic = user.getTopic();
  
  var otherTopics = this.getTopics();
  otherTopics = _.map(otherTopics, function(item) {return item.name});
  otherTopics = _.difference(otherTopics, allTopics);
  aTopics.push("__pre__");
  
  for (var i = 0; i < allTopics.length; i++) {
    if (allTopics[i] != "__post__" && allTopics[i] != "__pre__") {
      aTopics.push(allTopics[i]);    
    }
  }

  for (var i = 0; i < otherTopics.length; i++) {
    aTopics.push(otherTopics[i]);
  }
  
  
  aTopics.push("__post__");
  debug("allTopics", aTopics);
  callback(null, aTopics);
}

Topics.prototype.getTopics = function() {
  return this.topics;
}

Topics.prototype.findTopicByName = function(name) {
  var found = false;
  for (var i = 0; i < this.topics.length;i++) {
    if (this.topics[i].name === name) {
      found = this.topics[i];
      break;
    }
  }
  return found;
}

// Returns all topics that match the rule
// Not sure yet what this would be used for.
Topics.prototype.findTopicsByInput = function(input) {
  var topics = [];
  // for (var i = 0; i < this.topics.length;i++) {
  //   if (this.topics[i].name === name) {
  //     topics.push(this.topics[i]);
  //   }
  // }
  return topics;
}

// This will return the matching triggers
// filter by optinal topic
Topics.prototype.findTriggerByInput = function(input, topic) {
  return [];
}


module.exports = Topics;