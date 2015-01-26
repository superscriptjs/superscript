var debug = require("debug")("Message Plugin");

exports.addMessageProp = function(key, value, cb) {

  if (key !== "" && value !== "") {
    this.message.props[key] = value;
  } 
  
  cb(null, "");
}