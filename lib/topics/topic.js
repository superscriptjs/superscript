/**
  
  Topics are a grouping of gambits.
  The order of the Gambits are important, and a gambit can live in more than one topic.


  TODO
  - Fix TF-IDF
**/

var natural = require('natural');
var _ = require("underscore");
var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var debug = require("debug")("Topics");

var TfIdf = natural.TfIdf;
natural.PorterStemmer.attach();

var topicSchema = mongoose.Schema({ 
  name: {type: String, index: true, unique: true},
  keep: {type: Boolean, default: false },
  system: {type: Boolean, default: false },
  filter: {type: String, default: ""},
  keywords: {type: Array },
  tfidf : Object,
  gambits: [{ type: String, ref: 'Gambit' }]
});


topicSchema.pre('save', function (next) {
  var that = this;

  if (!_.isEmpty(this.keywords)) {
    this.tfidf = new TfIdf(that.keywords);
  } else {
    this.tfidf = new TfIdf();
  }
  next();
});

topicSchema.statics.findPendingTopicsForUser = function(user, msg, callback) {
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
}

topicSchema.plugin(findOrCreate);
module.exports = mongoose.model('Topic', topicSchema);
