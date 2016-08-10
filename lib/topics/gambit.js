/**

  A Gambit is a Trigger + Reply or Reply Set
  - We define a Reply as a subDocument in Mongo.

**/

// var regexreply = require("../parse/regexreply");

module.exports = function (mongoose, facts) {
  var Utils = require("../utils");
  var regexreply = require("ss-parser/lib/regexreply");
  var debug = require("debug-levels")("SS:Gambit");
  var async = require("async");
  var norm = require("node-normalizer");
  var findOrCreate = require("mongoose-findorcreate");
  var Common = require("./common")(mongoose);
  var gNormalizer;
  
  norm.loadData(function () {
    gNormalizer = norm;
    debug.verbose("Normaizer Loaded.");
  });

  /**

    I trigger is the matching rule behind a piece of input. It lives in a topic or several topics.
    A trigger also contains one or more replies.

  **/

  var gambitSchema = new mongoose.Schema({
    id: {type: String, index: true, default: Utils.genId()},

    // This is the input string that generates a rule,
    // In the event we want to export this, we will use this value.
    // Make this filed conditionally required if trigger is supplied
    input: {type: String},

    // The Trigger is a partly baked regex.
    trigger: {type: String, index: true},

    // If the trigger is a Question Match
    isQuestion: {type: Boolean, default: false},

    // If this gambit is nested inside a conditional block
    isCondition: {type: Boolean, default: false},

    // If the trigger is a Answer Type Match
    qType: {type: String, default: ""},
    qSubType: {type: String, default: ""},

    // The filter function for the the expression
    filter: {type: String, default: ""},

    // An array of replies.
    replies: [{ type: String, ref: "Reply"}],

    // Save a reference to the parent Reply, so we can walk back up the tree
    parent: { type: String, ref: 'Reply' },

    // This will redirect anything that matches elsewhere.
    // If you want to have a conditional rediect use reply redirects
    // TODO, change the type to a ID and reference another gambit directly
    // this will save us a lookup down the road (and improve performace.)
    redirect: {type: String, default: ""},
    
    // Text language  
    language: {type: String, default: "", index: false},

    // is disordered
    isDisordered: {type: Boolean, default: false, index: false},
    // disordered
    disorderedData: {type: Array, index: false}
  });

  gambitSchema.pre("save", function (next) {
    var self = this;

    // FIXME: This only works when the replies are populated which is not always the case.
    // self.replies = _.uniq(self.replies, function(item, key, id) {
    //   return item.id;
    // });

    // If input was supplied, we want to use it to generate the trigger
    if (self.input) {
      var input = gNormalizer.clean(self.input);
      // We want to convert the input into a trigger.
      regexreply.parse(Utils.quotemeta(input, true), self.isDisordered, facts, function (trigger, disordered, language) {
        self.trigger = trigger;
        self.language = language;
        self.disorderedData = disordered;
        next();
      });
    } else {
      // Otherwise we populate the trigger normally
      next();
    }
  });

  gambitSchema.methods.addReply = function (replyData, callback) {
    var self  = this;
    var Reply = mongoose.model('Reply');

    if (!replyData) {
      return callback("No data");
    }

    var reply = new Reply(replyData);
    reply.save(function (err) {
      if (err) {
        return callback(err);
      }
      self.replies.addToSet(reply._id);
      self.save(function (err) {
        callback(err, reply);
      });
    });
  };

  gambitSchema.methods.doesMatch = function (message, callback) {
    Common.doesMatch(this, message, null, callback);
  };

  gambitSchema.methods.clearReplies = function (callback) {
    var self = this;
    var Reply = mongoose.model('Reply');

    var clearReply = function (replyId, cb) {
      self.replies.pull({ _id: replyId });
      Reply.remove({ _id: replyId }, function (err) {
        if (err) {
          console.log(err);
        }

        debug.verbose('removed reply ' + replyId);

        cb(null, replyId);
      });
    };

    async.map(self.replies, clearReply, function (err, clearedReplies) {
      self.save(function (err2) {
        callback(err2, clearedReplies);
      });
    });
  };


  gambitSchema.methods.getRootTopic = function (cb) {
    var self = this;
    var Topic = mongoose.model('Topic');

    if (!self.parent) {
      Topic.findOne({ gambits: { $in: [ self._id ] } }).exec(function (err, doc) {
        cb(err, doc.name);
      });
    } else {
      Common.walkGambitParent(self._id, function (err, gambits) {
        if (gambits.length !== 0) {
          Topic.findOne({ gambits: { $in: [ gambits.pop() ] } }).exec(function (err, topic) {
            cb(null, topic.name);
          });
        } else {
          cb(null, "random");
        }
      });
    }
  };


  gambitSchema.plugin(findOrCreate);

  try {
    return mongoose.model("Gambit", gambitSchema);
  } catch(e) {
    return mongoose.model("Gambit");
  }
};
