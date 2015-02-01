
/**
  
  A Gambit is a Trigger + Reply or Reply Set
  - We define a Reply as a subDocument or a Trigger in Mongo.

**/

var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var Utils = require("../utils");
var regexreply = require("../parse/regexreply");
var debug = require("debug")("Gambit");
var norm = require("node-normalizer");
var _ = require("underscore");
var gNormalizer;

norm.loadData(function() {
  gNormalizer = norm;
  debug("Normaizer Loaded.")
});

// We need to pass in the global concept database to make available to 
// the parser (regexReply). This is used to do all the expanding of terms

module.exports = function(facts) {

  var replySchema = mongoose.Schema({ 
    id: {type: String, index: true, default: Utils.genId()},
    reply: {type: String, required: '{reply} is required.', trim: true},
    keep: {type: Boolean, default: false },
    filter: {type: String, default: ""},
  });

  /**

    I trigger is the matching rule behind a piece of input. It lives in a topic or several topics.
    A trigger also contains one or more replies.

  **/

  var gambitSchema = mongoose.Schema({
    id: {type: String, index: true, default: Utils.genId()},

    // This is the input string that generates a rule, 
    // In the event we want to export this, we will use this value.
    // Make this filed conditionally required if trigger is supplied
    input: { type: String },

    // The Trigger is a partly baked regex.
    trigger:  {type: String, index: true},

    // If the trigger is a Question Match
    isQuestion: {type: Boolean, default: false},

    // If the trigger is a Answer Type Match
    qType: {type: Boolean, default: false},
    qSubType: {type: Boolean, default: false},

    // The filter function for the the expression
    filter: {type: String, default: ""},

    // An array of replies.
    replies: [replySchema]
  });

  gambitSchema.pre('save', function (next) {
    var that = this;

    that.replies = _.uniq(that.replies, function(item, key, id) { 
      return item.id;
    });

    // If input was supplied, we want to use it to generate the trigger
    if (that.input && !that.trigger) {
      var input = gNormalizer.clean(this.input);
      
      // We want to convert the input into a trigger.
      regexreply.parse(input, facts, function(trigger) {
        that.trigger = trigger;
        next();
      });      
    } else {
      // Otherwise we populate the trigger normally
      next();
    }
  });


  gambitSchema.methods.doesMatch = function(obj, cb) {
    console.log("CMP", obj.clean, this.trigger)
    var re = new RegExp('^' + this.trigger + '$', "i")
    var valid = re.test(obj.clean);
    cb(null, valid)
  }

  gambitSchema.plugin(findOrCreate);
  return mongoose.model('Gambit', gambitSchema);
}



