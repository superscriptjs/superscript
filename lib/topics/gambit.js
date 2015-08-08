/*global Reply*/
/**

  A Gambit is a Trigger + Reply or Reply Set
  - We define a Reply as a subDocument in Mongo.

**/

// var regexreply = require("../parse/regexreply");

module.exports = function (mongoose, facts) {
  var Utils = require("../utils");
  var regexreply = require("../parse/regexreply");
  var debug = require("debug")("Gambit");
  var async = require("async");
  var norm = require("node-normalizer");
  var findOrCreate = require("mongoose-findorcreate");
  var gNormalizer;

  norm.loadData(function () {
    gNormalizer = norm;
    debug("Normaizer Loaded.");
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
    redirect: {type: String, default: ""}
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
      regexreply.parse(Utils.quotemeta(input, true), facts, function (trigger) {
        self.trigger = trigger;
        next();
      });
    } else {
      // Otherwise we populate the trigger normally
      next();
    }
  });

  gambitSchema.methods.addReply = function (replyData, callback) {
    var self = this;
    if (!replyData) {
      return callback("No data");
    }

    var reply = new Reply(replyData);

    reply.save(function (err) {
      if (err) {
        return callback(err);
      }
      self.replies.addToSet(reply._id);
      self.save(function (err2) {
        callback(err2, reply);
      });
    });
  };

  // TODO - Test against Qtypes too.
  gambitSchema.methods.doesMatch = function (message, cb) {
    var self = this;
    var match = false;
    regexreply.postParse(this.trigger, message, null, function (regexp) {
      var compiledRE = new RegExp("^" + regexp + "$", "i");
      debug("clean'" + message.clean + "' against " + self.trigger + " (" + regexp + ")");
      debug("lemma'" + message.lemString + "' against " + self.trigger + " (" + regexp + ")");

      match = message.clean.match(compiledRE);
      if (!match) {
        match = message.lemString.match(compiledRE);
      }
      cb(null, match);
    });
  };

  gambitSchema.methods.clearReplies = function (callback) {
    var self = this;

    var clearReply = function (replyId, cb) {
      self.replies.pull({ _id: replyId });
      Reply.remove({ _id: replyId }, function (err) {
        if (err) {
          console.log(err);
        }

        debug('removed reply ' + replyId);

        cb(null, replyId);
      });
    };

    async.map(self.replies, clearReply, function (err, clearedReplies) {
      self.save(function (err2) {
        callback(err2, clearedReplies);
      });
    });
  };

  gambitSchema.plugin(findOrCreate);

  try {
    return mongoose.model("Gambit", gambitSchema);
  } catch(e) {
    return mongoose.model("Gambit");
  }
};
