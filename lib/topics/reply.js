
var mongoose = require('mongoose');
var Utils = require("../utils");

module.exports = mongoose.Schema({ 
  id: {type: String, index: true, default: Utils.genId()},
  reply: {type: String, required: '{reply} is required.', trim: true},
  keep: {type: Boolean, default: false },
  filter: {type: String, default: ""},
});