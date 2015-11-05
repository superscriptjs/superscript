var wd = require("../lib/reply/wordnet"); 

exports.wordnetDefine = function(cb) {
  var args = Array.prototype.slice.call(arguments);
  var word;

  if (args.length == 2) {
    word = args[0];
  } else {
    word = this.message.words.pop();
  }

  wd.define(word, function(err, result){
    cb(null, "The Definition of " + word + " is " + result);  
  })  
}