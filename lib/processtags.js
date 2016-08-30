/**
*
* Parse the reply for additional tags, this is called once we have a reply candidate filtered out.
*
* @param {Object} replyObj - The Reply Object
* @param {string} replyObj.id - This is the 8 digit id mapping back to the ss parsed json
* @param {array} replyObj.stars - All of the matched values
* @param {string} replyObj.topic - The Topic name we matched on
* @param {Object} replyObj.reply - This is the Mongo Reply Gambit
* @param {string} replyObj.trigger_id - The trigger id (8 digit)
* @param {string} replyObj.trigger_id2 - The trigger id (mongo id)
*
* @param {Object} user - The User Object
*
* @param {Object} options - Extra cached items that are loaded async during load-time
* @param {array} options.plugins - An array of plugins loaded from the plugin folder
* @param {Object} options.scope - All of the data available to `this` inside of the plugin during execution
* @param {Object} options.topicSystem - Reference to the topicSystem (Mongo)
* @param {number} options.depth - (Global counter) How many times this function is called recursivly.

* @param {Object} options.qtypes - For Message Object: Cached qtypes
* @param {Object} options.normalize - For Message Object: Chached Normaizer
* @param {Object} options.facts - For Message Object: Cached Fact system

* Replies can have the following:
* Basic (captured text) subsitution ie: `I like <cap1>`
* Input (parts of speech) subsitution ie: `I like <noun>`
* Expanding terms using wordnet ie: `I like ~sport`
* Alternate terms to choose at random ie: `I like (baseball|hockey)`
* Custom functions that can be called ie: `I like ^chooseSport()`
* Redirects to another reply ie: `I like {@sport}`
*/

var Utils = require("./utils");
var processRedirects = require("./reply/inlineRedirect");
var topicRedirect = require("./reply/topicRedirect");
var respond = require("./reply/respond");
var customFunction = require("./reply/customFunction");
var processHelpers = require("./reply/common");
var async = require("async");
var _ = require("lodash");
var merge = require("deepmerge");
var replace = require("async-replace");
var debug = require("debug-levels")("SS:ProcessTags");

var REDIRECT_REGEX = /\{@(.+?)\}/;
var TOPIC_REGEX = /\^topicRedirect\(\s*([~\w<>\s]*),([~\w<>\s]*)\s*\)/;
var RESPOND_REGEX = /\^respond\(\s*([\w~]*)\s*\)/;

var CUSTOMFUN_REGEX = /\^(\w+)\(([\wА-я<>%,.\s\-\&\(\)\"\'\;\:\$\/]*)\)/; 
var WORDNET_REGEX = /(~)(\w[\w]+)/g;
var STATE_REGEX = /{(.*)}/g

// TODO - Move these to import and pre-process them
var CLEAR_REGEX = /{\s*CLEAR\s*}/i;
var CONTINUE_REGEX = /{\s*CONTINUE\s*}/i;
var END_REGEX = /{\s*END\s*}/i;


var replies = function (replyObj, user, options, callback) {
  debug.verbose("Depth", options.depth);
  var reply = replyObj.reply.reply;
  var globalScope = options.scope;
  
  var msg = options.localOptions.message;

  // This is the options for the (get)reply function, used for recursive traversal. 
  var replyOptions = {
    user: user,
    topic: replyObj.topic,
    depth: options.depth + 1,
    localOptions: options.localOptions,
    system: {
      plugins: options.plugins,
      scope: globalScope,
      topicsSystem: options.topicSystem,

      // Message
      question: options.qtypes,
      normalize: options.normalize,
      facts: options.facts
    }
  };

  debug.info("Reply '" + reply + "'");
  
  // Lets set the currentTopic to whatever we matched on, providing it isn't already set
  // The reply text might override that later.
  if (_.isEmpty(user.pendingTopic)) {
    user.setTopic(replyObj.topic);
  }
  
  // The topicSetter returns an array with the reply and topic
  var parsedTopicArr = processHelpers.topicSetter(reply);
  var newtopic = (parsedTopicArr[1] !== "") ? parsedTopicArr[1] : null;
  
  if (newtopic && !_.isEmpty(newtopic)) {
    debug.verbose("New topic found", newtopic);
    user.setTopic(newtopic);
  }
  
  reply = parsedTopicArr[0];

  var stars = [""];
  stars.push.apply(stars, replyObj.stars);

  // Replace <cap> and <capN>
  reply = reply.replace(/<cap>/ig, Utils.encodeCommas(stars[1]));
  for (var i = 1; i <= stars.length; i++) {
    reply = reply.replace(new RegExp("<cap" + i + ">", "ig"), Utils.encodeCommas(stars[i]));
  }

  // So this is to address GH-207, pulling the stars out of the history and 
  // feeding them forward into new replies. It allows us to save a tiny bit of
  // context though a conversation cycle.
  var matches = reply.match(/<p(\d{1,2})cap(\d{1,2})>/ig);
  if (matches) {
    for (var i = 0; i < matches.length; i++) {
      var m = matches[i].match(/<p(\d{1,2})cap(\d{1,2})>/i);
      var historyPtr = +m[1] - 1;
      var starPtr = +m[2] - 1;
      if (user.__history__.stars[historyPtr] && user.__history__.stars[historyPtr][starPtr]) {
        var term = user.__history__.stars[historyPtr][starPtr];
        reply = reply.replace(matches[i], term);        
      }
    }
  }


  // Here we clean up the reply and replace litteral strings and newlines.
  reply = Utils.trim(reply);
  reply = reply.replace(/\\n/ig, "\n");
  reply = reply.replace(/\\#/ig, "#");

  var clearConvoBit = false;
  // Threre SHOULD only be 0 or 1.
  var clearMatch = reply.match(CLEAR_REGEX);
  if (clearMatch) {
    debug.verbose("Adding Clear Conversation Bit");
    reply = reply.replace(clearMatch[0], "");
    reply = reply.trim();
    clearConvoBit = true;
  }

  var mbit = null;
  var mbitMatch = reply.match(CONTINUE_REGEX);
  if (mbitMatch) {
    debug.verbose("Adding CONTINUE Conversation Bit");
    reply = reply.replace(mbitMatch[0], "");
    reply = reply.trim();
    mbit = false;
  }

  var mbit2Match = reply.match(END_REGEX);
  if (mbit2Match) {
    debug.verbose("Adding END Conversation Bit");
    reply = reply.replace(mbit2Match[0], "");
    reply = reply.trim();
    mbit = true;
  }


  // <input> and <reply>
  // Special case, we have no items in the history yet,
  // This could only happen if we are trying to match the first input.
  // Kinda edgy.

  if (!_.isNull(msg)) {
    reply = reply.replace(/<input>/ig, msg.clean);
  }

  reply = reply.replace(/<reply>/ig, user.__history__.reply[0]);
  for (i = 1; i <= 9; i++) {
    if (reply.indexOf("<input" + i + ">")) {
      reply = reply.replace(new RegExp("<input" + i + ">", "ig"),
        user.__history__.input[i - 1]);
    }
    if (reply.indexOf("<reply" + i + ">")) {
      reply = reply.replace(new RegExp("<reply" + i + ">", "ig"),
        user.__history__.reply[i - 1]);
    }
  }

  replace(reply, WORDNET_REGEX, processHelpers.wordnetReplace, function(err, wordnetReply) {
    var orig_reply = reply;
    reply = wordnetReply;

    // Inline redirector.
    var redirectMatch = reply.match(REDIRECT_REGEX);
    var topicRedirectMatch = reply.match(TOPIC_REGEX);
    var respondMatch = reply.match(RESPOND_REGEX);
    var customFunctionMatch = reply.match(CUSTOMFUN_REGEX);

    var match = false;
    if (redirectMatch || topicRedirectMatch || respondMatch || customFunctionMatch) {
      var obj = [];
      obj.push({name: 'redirectMatch', index: (redirectMatch) ? redirectMatch.index : -1});
      obj.push({name: 'topicRedirectMatch', index: (topicRedirectMatch) ? topicRedirectMatch.index : -1});
      obj.push({name: 'respondMatch', index: (respondMatch) ? respondMatch.index : -1});
      obj.push({name: 'customFunctionMatch', index: (customFunctionMatch) ? customFunctionMatch.index : -1});

      match = _.result(_.find(_.sortBy(obj, 'index'), function(chr) {
        return chr.index >= 0;
      }), 'name');
    }

    var augmentCallbackHandle = function(err, replyString, messageProps, getReplyObject, mbit1) {
      if (err) {
        // If we get an error, we back out completly and reject the reply.
        debug.verbose("We got an error back from one of the Handlers", err);
        return callback(err, {});
      } else {

        var newReplyObject;
        if (_.isEmpty(getReplyObject)) {
          newReplyObject = replyObj;
          newReplyObject.reply.reply = replyString;

          // This is a new bit to stop us from matching more.
          if (mbit !== null) {
            newReplyObject.breakBit = mbit;
          }
          // If the function has the bit set, override the existing one
          if (mbit1 !== null) {
            newReplyObject.breakBit = mbit1;
          }

          // Clear the conversation thread (this is on the next cycle)
          newReplyObject.clearConvo = clearConvoBit;
        } else {

          // TODO we flush everything except stars..

          debug.verbose("getReplyObject", getReplyObject);
          newReplyObject = replyObj;
          newReplyObject.reply = getReplyObject.reply;
          newReplyObject.topic = getReplyObject.topicName;
          // update the root id with the reply id (it may have changed in respond)
          newReplyObject.id = getReplyObject.reply.id;

          // This is a new bit to stop us from matching more.
          if (mbit !== null) {
            newReplyObject.breakBit = mbit;
          }
          // If the function has the bit set, override the existing one
          if (mbit1 !== null) {
            newReplyObject.breakBit = mbit1;
          }

          if (getReplyObject.clearConvo === true) {
            newReplyObject.clearConvo = getReplyObject.clearConvo;
          } else {
            newReplyObject.clearConvo = clearConvoBit;
          }

          if (getReplyObject.subReplies) {
            if (newReplyObject.subReplies && _.isArray(newReplyObject.subReplies)) {
              newReplyObject.subReplies.concat(getReplyObject.subReplies);
            } else {
              newReplyObject.subReplies = getReplyObject.subReplies;
            }
          }

          // We also want to transfer forward any message props too
          if (getReplyObject.props) {
            newReplyObject.props = getReplyObject.props;
          }

          newReplyObject.minMatchSet = getReplyObject.minMatchSet;
        }

        debug.verbose("Return back to replies to re-process for more tags", newReplyObject);
        // Okay Lets call this function again
        return replies(newReplyObject, user, options, callback);
      }
    };

    if (redirectMatch && match === "redirectMatch") {
      return processRedirects(reply, redirectMatch, replyOptions, augmentCallbackHandle);
    }

    if (topicRedirectMatch && match === "topicRedirectMatch") {
      return topicRedirect(reply, stars, topicRedirectMatch, replyOptions, augmentCallbackHandle);
    }

    if (respondMatch && match === "respondMatch") {
      // In some edge cases you could name a topic with a ~ and wordnet will remove it.
      // respond needs a topic so we re-try again with the origional reply.
      if (respondMatch[1] === "") {
        reply = orig_reply;
        respondMatch = reply.match(RESPOND_REGEX);
      }

      return respond(reply, respondMatch, replyOptions, augmentCallbackHandle);
    }

    if (customFunctionMatch && match === "customFunctionMatch") {
      return customFunction(reply, customFunctionMatch, replyOptions, augmentCallbackHandle);
    }

    // Using global callback and user.
    var afterHandle = function(topic, cb) {
      return function(err, finalReply) {
        if (err) {
          console.log(err);
        }
        
        // This will update the reply with wordnet replaced changes and alternates
        finalReply = processHelpers.processAlternates(finalReply);
        
        var msgStateMatch = finalReply.match(STATE_REGEX);
        if (msgStateMatch && finalReply.indexOf("delay") === -1) {
          for(var i = 0; i < msgStateMatch.length; i++) {
            var stateObj = processHelpers.addStateData(msgStateMatch[i]);
            debug.verbose("Found Conversation State", stateObj);
            user.conversationState = merge(user.conversationState, stateObj);
            finalReply = finalReply.replace(msgStateMatch[i], "");
          }
          finalReply = finalReply.trim();
        }

        replyObj.reply.reply = Utils.decodeCommas(finalReply.replace(/\\s/ig, " "));

        if (clearConvoBit && clearConvoBit === true) {
          replyObj.clearConvo = clearConvoBit;  
        }

        // This is a new bit to stop us from matching more.
        if (!replyObj.breakBit && mbit !== null) {
          replyObj.breakBit = mbit;
        }
        
        debug.verbose("Calling back with", replyObj);

        if (!replyObj.props && msg.props) {
          replyObj.props = msg.props;
        } else {
          replyObj.props = merge(replyObj.props, msg.props);
        }

        cb(err, replyObj);
      };
    };

    replace(reply, WORDNET_REGEX, processHelpers.wordnetReplace, afterHandle(newtopic, callback));
  });

};

exports.replies = replies;

exports.threads = function(string) {
  var threads = [];
  var lines = string.split("\n");
  var strArr = [];
  for (var i = 0; i < lines.length; i++) {
    // http://rubular.com/r/CspCPIALNl
    var delayMatch = lines[i].match(/{\s*delay\s*=\s*(\d+)\s*}/);
    if (delayMatch) {
      var reply = Utils.trim(lines[i].replace(delayMatch[0], ""));
      threads.push({delay:delayMatch[1], string: reply});
    } else {
      strArr.push(lines[i]);
    }
  }
  return [strArr.join("\n"), threads];
};
