
var Utils = require("../utils");
var Sort = require("./sort");
var async = require("async");
var debug = require("debug")("ReplyModel");

module.exports = function(mongoose) {

  var replySchema = new mongoose.Schema({
    id: {type: String, index: true, default: Utils.genId()},
    reply: {type: String, required: '{reply} is required.', trim: true},
    keep: {type: Boolean, default: false },
    filter: {type: String, default: ""},
    parent: { type: String, ref: 'Gambit' },
    
    // Replies could referece other gambits
    // This forms the basis for the 'previous' - These are Children
    gambits: [{ type: String, ref: 'Gambit' }]
  });

  replySchema.methods.sortGambits = function(callback) {
    var that = this;
    var expandReorder = function(gambitId, cb) {
      Gambit.findById(gambitId, function(err, gambit){
        cb(null, gambit);
      });
    };

    async.map(this.gambits, expandReorder, function(err, newGambitList) {
      var newList = Sort.sortTriggerSet(newGambitList);
      that.gambits = newList.map(function(g){
        return g._id;
      });
      that.save(callback);
    });
  };
  try {
    return mongoose.model('Reply', replySchema);
  } catch(e) {
    return mongoose.model('Reply');
  }
};
