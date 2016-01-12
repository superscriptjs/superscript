/*global Reply*/
/**

  A Condition is a type of Gambit that contains a set of gambits, but instead 
  of having a static regex trigger it has some conditional logic

**/

// var regexreply = require("../parse/regexreply");

module.exports = function (mongoose) {
  var Utils = require("../utils");
  var debug = require("debug")("Condition");
  var findOrCreate = require("mongoose-findorcreate");
  
  var conditionSchema = new mongoose.Schema({
    id: {type: String, index: true, default: Utils.genId()},

    condition: {type: String},

    // An array of replies.
    // gambits: [{ type: String, ref: "Gambit"}]

  });

  conditionSchema.plugin(findOrCreate);

  try {
    return mongoose.model("Condition", conditionSchema);
  } catch(e) {
    return mongoose.model("Condition");
  }
};
