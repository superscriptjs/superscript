import mongoose from 'mongoose';
import mongoTenant from 'mongo-tenant';
import async from 'async';

import Utils from '../../utils';
import Sort from '../sort';
import helpers from '../helpers';

const createReplyModel = function createReplyModel(db) {
  const replySchema = new mongoose.Schema({
    id: { type: String, index: true, default: Utils.genId() },
    reply: { type: String, required: '{reply} is required.' },
    keep: { type: Boolean, default: false },
    filter: { type: String, default: '' },
    parent: { type: String, ref: 'Gambit' },

    // Replies could referece other gambits
    // This forms the basis for the 'previous' - These are Children
    gambits: [{ type: String, ref: 'Gambit' }],
  });

  // This method is similar to the topic.findMatch
  replySchema.methods.findMatch = function findMatch(message, options, callback) {
    helpers.findMatchingGambitsForMessage(db, this.getTenantId(), 'reply', this._id, message, options, callback);
  };

  replySchema.methods.sortGambits = function sortGambits(callback) {
    const self = this;
    const expandReorder = (gambitId, cb) => {
      db.model('Gambit').byTenant(this.getTenantId()).findById(gambitId, (err, gambit) => {
        cb(err, gambit);
      });
    };

    async.map(this.gambits, expandReorder, (err, newGambitList) => {
      if (err) {
        console.log(err);
      }

      const newList = Sort.sortTriggerSet(newGambitList);
      self.gambits = newList.map(g => g._id);
      self.save(callback);
    });
  };

  replySchema.plugin(mongoTenant);

  return db.model('Reply', replySchema);
};

export default createReplyModel;
