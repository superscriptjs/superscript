/**

  A Condition is a type of Gambit that contains a set of gambits, but instead 
  of having a static regex trigger it has some conditional logic

**/

module.exports = function (mongoose) {
  var Common = require("./common")(mongoose);
  var Utils = require("../utils");
  var debug = require("debug-levels")("SS:Condition");
  var findOrCreate = require("mongoose-findorcreate");
  
  var conditionSchema = new mongoose.Schema({
    id: {type: String, index: true, default: Utils.genId()},

    condition: {type: String},

    // An array of gambits that belong to this condition.
    gambits: [{ type: String, ref: "Gambit"}]

  });


  // At this point we just want to see if the condition matches, then pass the gambits to Common eachGambit
  conditionSchema.methods.doesMatch = function (options, callback) {
    var self = this;

    Common.eachGambit("condition", self._id, options, callback);
  };

  conditionSchema.plugin(findOrCreate);

  try {
    return mongoose.model("Condition", conditionSchema);
  } catch(e) {
    return mongoose.model("Condition");
  }
};
