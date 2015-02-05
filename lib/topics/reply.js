
var mongoose = require('mongoose');
var Utils = require("../utils");

var replySchema = mongoose.Schema({ 
  id: {type: String, index: true, default: Utils.genId()},
  reply: {type: String, required: '{reply} is required.', trim: true},
  keep: {type: Boolean, default: false },
  filter: {type: String, default: ""},

  // Replies could referece other gambits
  // This forms the basis for the 'previous'
  gambits: [{ type: String, ref: 'Gambit' }]
});

// module.exports = mongoose.model('Reply', replySchema);
module.exports = replySchema;