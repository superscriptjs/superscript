/**
  Topics are a grouping of gambits.
  The order of the Gambits are important, and a gambit can live in more than one topic.
**/

import mongoose from 'mongoose';
import mongoTenant from 'mongo-tenant';
import async from 'async';
import debuglog from 'debug-levels';

import modelNames from '../modelNames';
import Sort from '../sort';

const debug = debuglog('SS:Topics');

const createTopicModel = function createTopicModel(db) {
  const topicSchema = new mongoose.Schema({
    name: { type: String, index: true, unique: true },

    system: { type: Boolean, default: false },
    nostay: { type: Boolean, default: false },
    filter: { type: String, default: '' },
    keywords: { type: Array },

    // How we choose gambits can be `random` or `ordered`
    reply_order: { type: String, default: 'random' },

    // How we handle the reply exhaustion can be `keep` or `exhaust`
    reply_exhaustion: { type: String },

    gambits: [{ type: String, ref: modelNames.gambit }],
  });

  // This will create the Gambit and add it to the model
  topicSchema.methods.createGambit = function (gambitData, callback) {
    if (!gambitData) {
      return callback('No data');
    }

    const Gambit = db.model(modelNames.gambit).byTenant(this.getTenantId());
    const gambit = new Gambit(gambitData);
    gambit.save((err) => {
      if (err) {
        return callback(err);
      }
      this.gambits.addToSet(gambit._id);
      this.save((err) => {
        callback(err, gambit);
      });
    });
  };

  topicSchema.methods.sortGambits = function (callback) {
    const expandReorder = (gambitId, cb) => {
      db.model(modelNames.gambit).byTenant(this.getTenantId()).findById(gambitId, (err, gambit) => {
        if (err) {
          console.log(err);
        }
        cb(null, gambit);
      });
    };

    async.map(this.gambits, expandReorder, (err, newGambitList) => {
      if (err) {
        console.log(err);
      }

      const newList = Sort.sortTriggerSet(newGambitList);
      this.gambits = newList.map(gambit => gambit._id);
      this.save(callback);
    });
  };

  topicSchema.methods.clearGambits = function (callback) {
    const clearGambit = (gambitId, cb) => {
      this.gambits.pull({ _id: gambitId });
      db.model(modelNames.gambit).byTenant(this.getTenantId()).findById(gambitId, (err, gambit) => {
        if (err) {
          debug.error(err);
        }

        gambit.clearReplies(() => {
          db.model(modelNames.gambit).byTenant(this.getTenantId()).remove({ _id: gambitId }, (err) => {
            if (err) {
              debug.error(err);
            }

            debug.verbose('removed gambit %s', gambitId);

            cb(null, gambitId);
          });
        });
      });
    };

    async.map(this.gambits, clearGambit, (err, clearedGambits) => {
      this.save((err) => {
        callback(err, clearedGambits);
      });
    });
  };

  topicSchema.statics.findByName = function (name, callback) {
    this.findOne({ name }, {}, callback);
  };

  topicSchema.plugin(mongoTenant);

  return db.model(modelNames.topic, topicSchema);
};

export default createTopicModel;
