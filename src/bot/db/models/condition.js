/**
 * A Condition is a type of Gambit that contains a set of gambits, but instead
 * of having a static regex trigger it has some conditional logic
 */

import mongoose from 'mongoose';
import findOrCreate from 'mongoose-findorcreate';

import helpers from '../helpers';
import Utils from '../../utils';

const createConditionModel = function createConditionModel(db) {
  const conditionSchema = new mongoose.Schema({
    id: { type: String, index: true, default: Utils.genId() },
    condition: { type: String },

    // An array of gambits that belong to this condition.
    gambits: [{ type: String, ref: 'Gambit' }],
  });

  // At this point we just want to see if the condition matches, then pass the gambits to Common findMatchingGambitsForMessage
  conditionSchema.methods.doesMatch = function (message, options, callback) {
    helpers.findMatchingGambitsForMessage(db, 'condition', this._id, message, options, callback);
  };

  conditionSchema.plugin(findOrCreate);

  return db.model('Condition', conditionSchema);
};

export default createConditionModel;
