var debug = require("debug")("Message Plugin");
var history = require("../lib/history");
var _ = require("lodash");

exports.addMessageProp = function(key, value, cb) {

  if (key !== "" && value !== "") {
    this.message.props[key] = value;
  } 
  
  cb(null, "");
}

/*

  ## First Person (Single, Plural)
  I, we
  me, us
  my/mine, our/ours

  ## Second Person (Single, Plural)
  you, yous

  ## Third Person Single
  he (masculine)
  she (feminine)
  it (neuter)
  him (masculine)
  her (feminine)
  it (neuter)
  his/his (masculine)
  her/hers (feminine)
  its/its (neuter)

  ## Third Person plural
  they
  them
  their/theirs

*/
// exports.resolvePronouns = function(cb) {
//   var message = this.message;
//   var user = this.user;
//   message.pronounMap = {};

//   if (user['__history__']['input'].length !== 0) {
//     console.log(message.pronouns);
//     for (var i = 0; i < message.pronouns.length;i++) {
//       var pn = message.pronouns[i];
//       var value = findPronoun(pn, user);
//       message.pronounMap[pn] = value;
//     }
//     console.log(message.pronounMap)
//     cb(null, "");
//   } else {
//     for (var i = 0; i < message.pronouns.length;i++) {
//       var pn = message.pronouns[i];
//       message.pronounMap[pn] = null;
//     }
//     console.log(message.pronounMap)
//     cb(null, "");
//   }
// }

// var findPronoun = function(pnoun, user) {
//   console.log("Looking in history for", pnoun);

//   var candidates = history(user, { names: true });
//   if (!_.isEmpty(candidates)) {
//     debug("history candidates", candidates);
//     return candidates[0].names;
//   } else {
//     return null;
//   }
// }