// These are shared helpers for the models.
/* global Reply, Gambit */

var _walkReplyParent = function (repId, replyIds, cb) {
  Reply.findById(repId)
    .populate("parent")
    .exec(function (err, reply) {
      if (err) {
        console.log(err);
      }

      if (reply) {
        replyIds.push(reply._id);

        if (reply.parent.parent) {
          _walkReplyParent(reply.parent.parent, replyIds, cb);
        } else {
          cb(null, replyIds);
        }
      } else {
        cb(null, replyIds);
      }
    });
};

exports.walkReplyParent = function (repId, cb) {
  _walkReplyParent(repId, [], cb);
};


var _walkGambitParent = function (gambitId, gambitIds, cb) {
  Gambit.findOne({_id: gambitId})
    .populate("parent")
    .exec(function (err, gambit) {
      if (err) {
        console.log(err);
      }

      if (gambit) {
        gambitIds.push(gambit._id);
        if (gambit.parent && gambit.parent.parent) {
          _walkGambitParent(gambit.parent.parent, gambitIds, cb);
        } else {
          cb(null, gambitIds);
        }
      } else {
        cb(null, gambitIds);
      }
    });
};

exports.walkGambitParent = function (gambitId, cb) {
  _walkGambitParent(gambitId, [], cb);
};
