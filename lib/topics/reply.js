
var Utils = require("../utils");

module.exports = function(mongoose) {

  var replySchema = new mongoose.Schema({
    id: {type: String, index: true, default: Utils.genId()},
    reply: {type: String, required: '{reply} is required.', trim: true},
    keep: {type: Boolean, default: false },
    filter: {type: String, default: ""},

    // Replies could referece other gambits
    // This forms the basis for the 'previous'
    gambits: [{ type: String, ref: 'Gambit' }]
  });

  try {
    return mongoose.model('Reply', replySchema);
  } catch(e) {
    return mongoose.model('Reply');
  }
};
