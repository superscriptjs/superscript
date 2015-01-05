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

// TODO Add Keywords and options
// TODO Reindex TF-IDF DB
Topics.prototype.createTopic = function(name, options) {
  var topic = new Topic(name, null, null, null, null);
  this.topics.push(topic);
  return topic;
}

// This will become more of a discovery system in the new topicSystem
// The order goes PRE, Current Topic, Hightest ranked search, remaining topics, POST
Topics.prototype.findPendingTopicsForUser = function(user, msg, callback) {

  var that = this;
  var aTopics = [];
  var docs = [];
  this.tfidf.tfidfs(msg.lemString.tokenizeAndStem(), function(i,m,k){
    if (k != "__pre__" && k != "__post__")
      docs.push({topic:k,score:m});
  });

  var topicOrder = _.sortBy(docs, function(item){return item.score}).reverse();
  var allTopics = _.map(topicOrder, function(item, val){ return item.topic;});
  
  // All topics with keywords.. we may have topics with new keywords? 
  // like random or dynamically created topics

  // Move the current topic to the top of the stack,
  // This allows us to match previous rejoiners
  var currentTopic = user.getTopic();
  allTopics.unshift(currentTopic);

  var otherTopics = this.getTopics();
  otherTopics = _.map(otherTopics, function(item) {return item.name});
  otherTopics = _.difference(otherTopics, allTopics);

  // Filter out system topics
  allTopics = _.filter(allTopics, function(topicName, val){ 
    var topic = that.findTopicByName(topicName);
    return (topic && topic.flags) ? (topic.flags.indexOf("system") === -1) : false
  });

  aTopics.push("__pre__");

  for (var i = 0; i < allTopics.length; i++) {
    if (allTopics[i] != "__post__" && allTopics[i] != "__pre__" ) {
      aTopics.push(allTopics[i]);    
    }
  }

  for (var i = 0; i < otherTopics.length; i++) {
    if (otherTopics[i] != "__post__" && otherTopics[i] != "__pre__" ) {
      aTopics.push(otherTopics[i]);
    }
  }
  
  aTopics.push("__post__");
  debug("allTopics", aTopics);
  callback(null, aTopics);
}

Topics.prototype.getTopics = function() {

  // Filter out system topics
  return _.filter(this.topics, function(topic, val){ 
    return (topic.flags.indexOf("system") === -1);
  });
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