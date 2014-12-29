var _ = require("underscore");
var Topic = require("./topic");

var Topics = function(data) {
  var that = this;
  this.topics = [];

  _.each(Object.keys(data.gTopics), function(topicName) {
    var topicFlags = data.gTopicFlags[topicName];
    var triggers =  data.gTopics[topicName];
    var order = data.gSorted.topics[topicName];
    that.topics.push(new Topic(topicName, triggers, topicFlags, order));
  });
}

Topics.prototype.findPendingTopicsForUser = function(user) {
  var aTopics = []
  var currentTopic = user.getTopic();
  aTopics.push("__pre__");
  aTopics.push(currentTopic);
  aTopics.push("__post__");
  return aTopics;
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