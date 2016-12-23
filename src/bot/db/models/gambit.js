/**
  A Gambit is a Trigger + Reply or Reply Set
  - We define a Reply as a subDocument in Mongo.
**/

import mongoose from 'mongoose';
import findOrCreate from 'mongoose-findorcreate';
import mongoTenant from 'mongo-tenant';
import debuglog from 'debug-levels';
import async from 'async';
import parser from 'ss-parser';

import modelNames from '../modelNames';
import Utils from '../../utils';

const debug = debuglog('SS:Gambit');

/**
  A trigger is the matching rule behind a piece of input. It lives in a topic or several topics.
  A trigger also contains one or more replies.
**/

const createGambitModel = function createGambitModel(db, factSystem) {
  const gambitSchema = new mongoose.Schema({
    id: { type: String, index: true, default: Utils.genId() },

    // This is the input string that generates a rule,
    // In the event we want to export this, we will use this value.
    // Make this filed conditionally required if trigger is supplied
    input: { type: String },

    // The Trigger is a partly baked regex.
    trigger: { type: String, index: true },

    // If the trigger is a Question Match
    isQuestion: { type: Boolean, default: false },

    // If this gambit is nested inside a conditional block
    conditions: [{ type: String, default: '' }],

    // The filter function for the the expression
    filter: { type: String, default: '' },

    // An array of replies.
    replies: [{ type: String, ref: modelNames.reply }],

    // How we choose gambits can be `random` or `ordered`
    reply_order: { type: String, default: 'random' },

    // How we handle the reply exhaustion can be `keep` or `exhaust`
    reply_exhaustion: { type: String, default: 'exhaust' },

    // Save a reference to the parent Reply, so we can walk back up the tree
    parent: { type: String, ref: modelNames.reply },

    // This will redirect anything that matches elsewhere.
    // If you want to have a conditional rediect use reply redirects
    // TODO, change the type to a ID and reference another gambit directly
    // this will save us a lookup down the road (and improve performace.)
    redirect: { type: String, default: '' },
  });

  gambitSchema.pre('save', function (next) {
    // FIXME: This only works when the replies are populated which is not always the case.
    // this.replies = _.uniq(this.replies, (item, key, id) => {
    //   return item.id;
    // });

    // If we created the trigger in an external editor, normalize the trigger before saving it.
    if (this.input && !this.trigger) {
      const facts = factSystem.getFactSystem(this.getTenantId());
      return parser.normalizeTrigger(this.input, facts, (err, cleanTrigger) => {
        this.trigger = cleanTrigger;
        next();
      });
    }
    next();
  });

  gambitSchema.methods.addReply = function (replyData, callback) {
    if (!replyData) {
      return callback('No data');
    }

    const Reply = db.model(modelNames.reply).byTenant(this.getTenantId());
    const reply = new Reply(replyData);
    reply.save((err) => {
      if (err) {
        return callback(err);
      }
      this.replies.addToSet(reply._id);
      this.save((err) => {
        callback(err, reply);
      });
    });
  };

  gambitSchema.methods.clearReplies = function (callback) {
    const self = this;

    const clearReply = function (replyId, cb) {
      self.replies.pull({ _id: replyId });
      db.model(modelNames.reply).byTenant(this.getTenantId()).remove({ _id: replyId }, (err) => {
        if (err) {
          console.log(err);
        }

        debug.verbose('removed reply %s', replyId);

        cb(null, replyId);
      });
    };

    async.map(self.replies, clearReply, (err, clearedReplies) => {
      self.save((err2) => {
        callback(err2, clearedReplies);
      });
    });
  };

  gambitSchema.plugin(findOrCreate);
  gambitSchema.plugin(mongoTenant);

  return db.model('ss_gambit', gambitSchema);
};

export default createGambitModel;
