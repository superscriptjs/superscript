'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// import debuglog from 'debug';
// import _ from 'lodash';

// import history from '../bot/history';

// const debug = debuglog('Message Plugin');

var addMessageProp = function addMessageProp(key, value, callback) {
  if (key !== '' && value !== '') {
    return callback(null, _defineProperty({}, key, value));
  }

  return callback(null, '');
};

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

//   if (user['history']['input'].length !== 0) {
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

exports.default = { addMessageProp: addMessageProp };