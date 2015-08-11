// These are shared helpers for the models.
var debug = require("debug")("Common");

var _walkReplyParent = function (repId, replyIds, cb) {
  Reply.findById(repId)
    .populate('parent')
    .exec(function (err, reply) {
      if (err) {
        console.log(err);
      }

      if (reply) {
        replyIds.push(reply._id);

        if (reply.parent.parent) {
          _walkReplyParent(reply.parent.parent, replyIds, cb);
        } else {
          cb(replyIds);
        }
      } else {
        cb(replyIds);
      }
    });
};

exports.walkParent = function (repId, cb) {
  _walkReplyParent(repId, [], cb);
};


var _walkGambitParent = function (gambitId, gambitIds, cb) {
  Gambit.findOne({_id: gambitId})
    .populate('parent')
    .exec(function (err, gambit) {
      if (err) {
        console.log(err);
      }

      if (gambit) {
        gambitIds.push(gambit._id);
        debug("Found one...", gambit);
        if (gambit.parent.parent) {
          console.log("Step in.");
          _walkReplyParent(gambit.parent.parent, gambitIds, cb);
        } else {
          cb(gambitIds);
        }
      } else {
        cb(gambitIds);
      }
    });
};

exports.walkGambitParent = function (gambitId, cb) {
  _walkGambitParent(gambitId, [], cb);
};
