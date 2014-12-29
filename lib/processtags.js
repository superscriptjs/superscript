var async     = require("async");
var replace   = require("async-replace");
var Utils     = require("./utils");
var wordnet   = require("./wordnet");
var _         = require("underscore");

var debug     = require("debug")("ProcessTags");
var dWarn     = require("debug")("ProcessTags:Warning");

var processAlternates = function(reply) {
  // Reply Alternates.
  var match  = reply.match(/\((.+?)\)/);
  var giveup = 0;
  while (match) {
    debug("Reply has Alternates");

    giveup++;
    if (giveup >= 50) {
      dWarn("Infinite loop when trying to process optionals in trigger!");
      return "";
    }

    var parts = match[1].split("|");
    var opts  = [];
    for (var i = 0; i < parts.length; i++) {
      opts.push(parts[i].trim());
    }

    var resp = Utils.getRandomInt(0, opts.length - 1);
    reply = reply.replace(new RegExp("\\(" + Utils.quotemeta(match[1]) + "\\)\\s*"), opts[resp]);
    match  = reply.match(/\((.+?)\)/);
  }

  return reply;
}

// Process tags in a reply element.
module.exports = function (reply, user, callback) {

  debug("IN process tags", reply);

  var duplicateMessage = false;

  var rt = topicSetter(reply);
  reply = rt[0];
  if (rt[1] != "") {
    newtopic = rt[1];
  }

  if (newtopic && !duplicateMessage) {
    debug("Topic Change", newtopic)
    user.setTopic(newtopic);
  }

  // Check for reply keep flag, this will override the topicFlag
  // TODO - Strip this off in getReply.
  match = reply.match(/\{keep\}/i);
  if (match) {
    reply = reply.replace(new RegExp("{keep}","ig"), "");
  }


  // Replace <cap> and <capN>
  reply = reply.replace(/<cap>/ig, stars[1]);
  for (var i = 1; i <= stars.length; i++) {
    reply = reply.replace(new RegExp("<cap" + i + ">","ig"), stars[i]);
  }


  var cleanedReply = Utils.trim(reply);
  debug("Calling back with", cleanedReply);
  callback(null, cleanedReply); 

  // var userObj = options.user;
  // var msg = options.msg; 
  // var reply = options.reply;
  // var st = options.stars;
  // var bst = options.botstars;
  // var step = options.step;
  
  // var plugins = options.system.plugins;
  // var topicFlags = options.system.topicFlags;
  // var sorted = options.system.sorted;
  // var topics = options.system.topics;
  // var facts = options.system.facts;
  
  // // Prepare the stars and botstars.
  // var stars = [""];
  // stars.push.apply(stars, st);
  
  // var botstars = [""];
  // botstars.push.apply(botstars, bst);
  
  // if (stars.length == 1) {
  //   stars.push("undefined");
  // }
  // if (botstars.length == 1) {
  //   botstars.push("undefined");
  // }

  // // For while loops.
  // var match;
  // var giveup = 0;
  // var newtopic;
  // var duplicateMessage = false;
  // var forceKeepMessage = false;

  // reply = reply.replace(/<cap>/ig, stars[1]);
  // reply = reply.replace(/<botstar>/ig, botstars[1]);
  // for (var i = 1; i <= stars.length; i++) {
  //   reply = reply.replace(new RegExp("<cap" + i + ">","ig"), stars[i]);
  // }

  // reply = reply.replace(/\\s/ig, " ");
  // reply = reply.replace(/\\n/ig, "\n");
  // reply = reply.replace(/\\#/ig, "#");

  // var rt = topicSetter(reply);
  // reply = rt[0];
  // if (rt[1] != "") {
  //   newtopic = rt[1];
  // }

  // // Inline redirector.
  // // This is a real bitch because we no longer return
  // match = reply.match(/\{@(.+?)\}/);
  
  // var getreply  = require("./getreply");

  // var options = {
  //   user: userObj,
  //   step: step+1,
  //   system : options.system
  // }

  // if (match) {
  //   // We use async to capture multiple matches in the same reply
  //   return async.whilst(
  //     function () { return match; },
  //     function (cb) {
  //       var target = Utils.trim(match[1]);
  //       debug("Inline redirection to: " + target);
  //       options.message = {clean: target, qtype: "SYSTEM:sys", lemString: "___SYSTEM___" };
  //       getreply(options, function(err, subreply) {
  //         debug("CallBack from inline redirect", subreply)
  //         reply = reply.replace(new RegExp("\\{@" + Utils.quotemeta(target) + "\\}", "i"), subreply);
  //         match = reply.match(/\{@(.+?)\}/);
  //         cb(err);
  //       });
  //     },
  //     function(err) {
  //       if (err) {
  //         debug("CallBack ERROR from inline redirect", err);
  //         return callback(err, null);
  //       } else {
  //         debug("CallBack from inline redirect", reply);
  //         return callback(null, reply);
  //       }
  //     }
  //   );
  // }

  // // <input> and <reply>
  
  // // Special case, we have no items in the history yet,
  // // This could only happen if we are trying to match the first input. 
  // // Kinda edgy.

  // if (!_.isNull(msg)) {
  //   reply = reply.replace(/<input>/ig, msg.clean);  
  // }
  
  // reply = reply.replace(/<reply>/ig, userObj["__history__"]["reply"][0]);
  // for (var i = 1; i <= 9; i++) {
  //   if (reply.indexOf("<input" + i + ">")) {
  //     reply = reply.replace(new RegExp("<input" + i + ">","ig"),
  //       userObj["__history__"]["input"][i-1]);
  //   }
  //   if (reply.indexOf("<reply" + i + ">")) {
  //     reply = reply.replace(new RegExp("<reply" + i + ">","ig"),
  //       userObj["__history__"]["reply"][i-1]);
  //   }
  // }

  // // Check for reply keep flag, this will override the topicFlag
  // match = reply.match(/\{keep\}/i);
  // if (match) {
  //   reply = reply.replace(new RegExp("{keep}","ig"), "");
  //   forceKeepMessage = true;
  // }

  // // Automatically reject input that has been said
  // var currentTopic = userObj.getTopic();
  // var currentFlags = topicFlags[currentTopic];

  // // No history yet.. must be the first message.
  // if (currentFlags == undefined) {
  //   currentFlags = topicFlags[userObj.getTopic()] || [];
  // }

  // // We set the topic back to what it was before this one.
  // // console.log(userObj["__history__"]["topic"])
  // if (currentFlags.indexOf("nostay") !== -1) {
  //   // We want to set the topic to the pevious one
  //   // Since we have not saved the new one in the history yet, we just us the last one.
  //   newtopic = userObj["__history__"]["topic"][0];
  // }

  // // Handle WordNet in Replies
  // function wordnetReplace(match, sym, word, p3, offset, done) {
  //   wordnet.lookup(word, sym, function(err, words){
  //     words = words.map(function(item) {return item.replace(/_/g, " ")})
  //     var resp = Utils.getRandomInt(0, words.length - 1);
  //     debug("Wordnet Replies", words)
  //     done(null, words[resp])
  //   });
  // }

  // replace(reply, /(~)(\w[\w]+)/g, wordnetReplace, function(err, reply) {

  //   if (match = reply.match(/\^(\w+)\(([\w<>,\s]*)\)/)) {

  //     var scope = {
  //       message: msg,
  //       user: userObj,
  //       facts: facts
  //     }

  //     _.extend(scope, options.system.scope)

  //     parseCustomFunctions(reply, plugins, scope, function(err, reply) {
  //       reply = processAlternates(reply);

  //       // Check that we dont have another topic change
  //       var rt = topicSetter(reply);
  //       reply = rt[0];
  //       if (rt[1] != "") {
  //         newtopic = rt[1];
  //       }

  //       // We only want to change topics if the message has not been exausted
  //       if (newtopic && !duplicateMessage) {
  //         debug("Topic Change", newtopic)
  //         userObj.setTopic(newtopic);
  //       }

  //       debug("Calling back with", Utils.trim(reply));
  //       return callback(err, Utils.trim(reply));
  //     });
      
  //   } else {
  //     reply = processAlternates(reply);

  //     // We only want to change topics if the message has not been exausted
  //     if (newtopic && !duplicateMessage) {
  //       debug("Topic Change", newtopic)
  //       userObj.setTopic(newtopic);
  //     }
      
  //     debug("Calling back with", Utils.trim(reply));
  //     callback(err, Utils.trim(reply)); 

  //   }
  // });
};

var topicSetter = function(reply) {
  var match = reply.match(/\{topic=(.+?)\}/i);
  var giveup = 0;
  var newtopic;

  while (match) {
    giveup++;
    if (giveup >= 50) {
      dWarn("Infinite loop looking for topic tag!");
      break;
    }
    var name = match[1];
    newtopic = name;    
    reply = reply.replace(new RegExp("{topic=" + Utils.quotemeta(name) + "}","ig"), "");
    match = reply.match(/\{topic=(.+?)\}/i); // Look for more
  }
  return [reply, newtopic]
}

var parseCustomFunctions = function(reply, plugins, scope, callback ) {
  // New Custom Function Handle
  // This matches the Redirect finder above
  
    var match = reply.match(/\^(\w+)\(([\w<>,\s]*)\)/)

    // We use async to capture multiple matches in the same reply
    return async.whilst(
      function () { return match; },
      function (cb) {
        // Call Function here
        
        var main = match[0];
        var pluginName = Utils.trim(match[1]);
        var partsStr = Utils.trim(match[2]);
        var parts = partsStr.split(",");
        
        var args  = [];
        for (var i = 0; i < parts.length; i++) {
          if (parts[i] != "") {
            args.push(parts[i].trim());
          }
        }

        if (plugins[pluginName]) {

          // SubReply is the results of the object coming back
          // TODO. Subreply should be optional and could be undefined, or null
          args.push(function customFunctionHandle(err, subreply) {

            match = false;
            reply = reply.replace(main, subreply);
            match = reply.match(/\^(\w+)\(([~\w<>,\s]*)\)/);
            if (err) {
              cb(err);
            } else {
              cb();
            }
          }); 

          debug("Calling Plugin Function", pluginName);
          plugins[pluginName].apply(scope, args);

        } else {
          // If a function is missing, we kill the line and return empty handed
          dWarn("Custom Function not-found", pluginName)
          match = false;
          cb(null, "");
        }
      },
      function(err) {
        callback(err, reply);
      }
    );
}