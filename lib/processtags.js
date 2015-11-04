/**
*
* Parse the reply for additional tags.
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

*/

var async = require("async");
var replace = require("async-replace");
var Utils = require("./utils");
var _ = require("lodash");
var processRedirects = require("./processRedirect");
var processHelpers = require("./processHelpers");
var Message = require("./message");
var debug = require("debug")("ProcessTags");
var dWarn = require("debug")("ProcessTags:Warning");


exports.replies = function (replyObj, user, options, callback) {

  var reply = replyObj.reply.reply;
  var plugins = options.plugins;
  var globalScope = options.scope;
  var gDepth = options.depth;
  var gNormalize = options.normalize;
  var gFacts = options.facts;
  var gQtypes = options.qtypes;
  var topicSystem = options.topicSystem;

  var redirectMatch = false;
  var newtopic;

  // Kinda hacky to pluck the msg from scope.
  var msg = globalScope.message;
  var duplicateMessage = false;

  // This is the options for the reply function, used for recursive traversal. 
  var replyOptions = {
    user: user,
    topic: replyObj.topic,
    depth: gDepth + 1,
    system: {
      plugins: plugins,
      scope: globalScope,
      topicsSystem: options.topicSystem,

      // Message
      question: gQtypes,
      normalize: gNormalize,
      facts: gFacts
    }
  };

  // These are just cached values for the creating a new Message Object
  var messageOptions = {
    qtypes: gQtypes,
    norm: gNormalize,
    facts: gFacts
  };

  // Lets set the currentTopic to whatever we matched on.
  // The reply text might override that later.
  user.setTopic(replyObj.topic);
  var rt = processHelpers.topicSetter(reply);

  reply = rt[0];
  if (rt[1] !== "") {
    newtopic = rt[1];
  }

  // Check for reply keep flag, this will override the topicFlag
  var match = reply.match(/\{keep\}/i);
  if (match) {
    reply = reply.replace(new RegExp("{keep}", "ig"), "");
  }

  var stars = [""];
  stars.push.apply(stars, replyObj.stars);

  // Replace <cap> and <capN>
  reply = reply.replace(/<cap>/ig, stars[1]);
  for (var i = 1; i <= stars.length; i++) {
    reply = reply.replace(new RegExp("<cap" + i + ">", "ig"), stars[i]);
  }

  // Inline redirector.
  // This is a real bitch because we no longer return
  redirectMatch = reply.match(/\{@(.+?)\}/);

  if (redirectMatch) {
  
    return async.whilst(
      function () {
        return redirectMatch;
      },
      function (cb) {
        var getreply = require("./getreply");

        var target = redirectMatch[1];
        debug("Inline redirection to: '" + target + "'");

        processHelpers.getTopic(topicSystem, replyObj.topic, function (err, topicData) {
          replyOptions.aTopics = [];
          replyOptions.aTopics.push(topicData);

          new Message(target, messageOptions, function (replyMessageObject) {
            replyOptions.message = replyMessageObject;
            debug("replyMessageObject", replyMessageObject);

            
            getreply(replyOptions, function (err, subreply) {
              if (err) {
                console.log(err);
              }

              debug("subreply", subreply);

              if (subreply) {
                var rd1 = new RegExp("\\{@" + Utils.quotemeta(target) + "\\}", "i");
                reply = reply.replace(rd1, subreply.string);
                redirectMatch = reply.match(/\{@(.+?)\}/);
              } else {
                redirectMatch = false;
                reply = reply.replace(new RegExp("\\{@" + Utils.quotemeta(target) + "\\}", "i"), "");
              }

              if (gDepth === 50) {
                cb("Depth Error");
              } else {
                cb(null);
              }
            }); // getReply
          }); // Message
        });
      },
      function (err) {
        if (err) {
          return callback(err, "", globalScope.message.props);
        } else {
          debug("CallBack from inline redirect", Utils.trim(reply));
          processHelpers.parseCustomFunctions(reply, plugins, globalScope, function (err2, newReply) {
            if (err2) {
              console.log(err2);
            }
            return callback(null, Utils.trim(newReply), globalScope.message.props);
          });
        }
      }
    );
    
    // processRedirects(redirectMatch, options, callback);
  }

  reply = Utils.trim(reply);
  reply = reply.replace(/\\s/ig, " ");
  reply = reply.replace(/\\n/ig, "\n");
  reply = reply.replace(/\\#/ig, "#");

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


  redirectMatch = reply.match(/\^topicRedirect\(\s*([~\w<>\s]*),([~\w<>\s]*)\s*\)/);

  if (redirectMatch) {

    return async.whilst(
      function () {
        return redirectMatch;
      },
      function (cb) {
        var main = Utils.trim(redirectMatch[0]);
        var topic = Utils.trim(redirectMatch[1]);
        var target = Utils.trim(redirectMatch[2]);
        var getreply = require("./getreply");
        debug("Topic Redirection to: " + target + " topic:" + topic);
        user.setTopic(topic);

        processHelpers.getTopic(topicSystem, topic, function (err, topicData) {
          if (err) {
            /*
              In this case the topic does not exist, we want to just pretend it wasn't
              provided and reply with whatever else is there.
             */
            redirectMatch = reply.match(/\^topicRedirect\(\s*([~\w<>\s]*),([~\w<>\s]*)\s*\)/);
            reply = Utils.trim(reply.replace(main, ""));
            debug("Invalid Topic", reply);
            return cb(null);
          }

          replyOptions.aTopics = [];
          replyOptions.aTopics.push(topicData);

          new Message(target, messageOptions, function (replyMessageObject) {

            replyOptions.message = replyMessageObject;
            // Pass the stars forward
            replyOptions.message.stars = stars.slice(1);
            getreply(replyOptions, function (err, subreply) {
              if (err) {
                cb(null);
              }

              if (subreply) {
                debug("CallBack from inline redirect", subreply);
                reply = reply.replace(main, subreply.string);
                replyObj = subreply;
                redirectMatch = reply.match(/\^topicRedirect\(\s*([~\w<>\s]*),([~\w<>\s]*)\s*\)/);
              } else {
                redirectMatch = false;
                reply = reply.replace(main, "");
                replyObj = {};
              }

              if (gDepth === 50) {
                cb("Depth Error");
              } else {
                cb(null);
              }
            }); // getReply
          }); // Message
        });

      },
      function (err) {
        if (err) {
          return callback(err, "");
        } else {
          // TODO - Custom function check?
          debug("CallBack from inline redirect", reply, replyObj);
          return callback(null, reply, globalScope.message.props, replyObj);
        }
      }

    );
  }

  // System function for checking matches in a specific topic
  // This is like redirect accept we search matches in a new topic so it is more fuzzy
  // This would be used to access topics in a unlisted system function
  var respondMatch = reply.match(/\^respond\(\s*([\w~]*)\s*\)/);

  if (respondMatch) {

    return async.whilst(
      function () {
        return respondMatch;
      },
      function (cb) {
        var getreply = require("./getreply");
        var newTopic = Utils.trim(respondMatch[1]);
        debug("Topic Check with new Topic: " + newTopic);

        processHelpers.getTopic(topicsSystem, replyObj.topic, function (err, topicData) {

          replyOptions.aTopics = [];
          replyOptions.message = msg;
          replyOptions.aTopics.push(topicData);

          getreply(replyOptions, function (err, subreply) {
            if (err) {
              console.log(err);
            }

            debug("CallBack from respond topic", subreply);

            if (subreply) {
              reply = subreply.string || "";
              replyObj = subreply;
              respondMatch = reply.match(/\^respond\(\s*([\w~]*)\s*\)/);
            } else {
              respondMatch = false;
              reply = "";
              replyObj = {};
            }

            if (gDepth === 50) {
              cb("Depth Error");
            } else {
              cb(null);
            }
          });
        });
      },
      function (err) {
        if (err) {
          return callback(err, "", globalScope.message.props, replyObj);
        } else {
          debug("CallBack from Respond Function", reply);
          // TODO Custom function check
          return callback(null, reply, globalScope.message.props, replyObj);
        }
      }
    );
  }

  // Async Replace because normal replace callback is SYNC.
  replace(reply, /(~)(\w[\w]+)/g, processHelpers.wordnetReplace, function (err, newReply) {
    if (err) {
      console.log(err);
    }

    if (newReply.match(/\^(\w+)\(([\w<>,\s]*)\)/)) {
      processHelpers.parseCustomFunctions(newReply, plugins, globalScope, function (err2, newReply2) {
        if (err2) {
          console.log(err2);
        }

        reply = processHelpers.processAlternates(newReply2);

        // Check that we dont have another topic change
        var rt2 = processHelpers.topicSetter(reply);
        reply = rt2[0];
        if (rt2[1] !== "") {
          newtopic = rt2[1];
        }

        // We only want to change topics if the message has not been exausted
        if (newtopic && !duplicateMessage) {
          debug("Topic Change", newtopic);
          user.setTopic(newtopic);
        }

        debug("Calling back with", reply);
        callback(err, reply, globalScope.message.props);

      });

    } else {
      reply = processHelpers.processAlternates(newReply);

      // We only want to change topics if the message has not been exausted
      if (newtopic && !duplicateMessage) {
        debug("Topic Change", newtopic);
        user.setTopic(newtopic);
      }

      debug("Calling back with", reply);
      callback(null, reply, globalScope.message.props);
    }
  });
};

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
