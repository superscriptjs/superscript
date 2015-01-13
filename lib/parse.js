var fs = require("fs");
var async = require("async");
var Utils = require("../lib/utils");
var sort = require("../lib/sort");
var debug = require("debug")("Parse");
var dWarn = require("debug")("Parse:Warn");
var norm = require("node-normalizer");
var crc = require('crc');
var regexreply = require("./regexreply");
var facts = require("sfacts");
var _ = require("underscore");

var natural = require('natural');
var TfIdf = natural.TfIdf;
natural.PorterStemmer.attach();

var topicFlags = {};
var gTopics = {};
var gPrevTopics = {};
var gSorted = {};
var gKeywords = {};
var gIncludes = {};
var gLineage = {};
var gTriggerCount = 0;
var gReplyCount = 0;

module.exports = function(factSystem) {
  
  var factSystem = (factSystem) ? factSystem : facts.create("systemDB")
  
  var loadDirectory = function(path, callback) {

    walk(path, function(err, files){
      debug(files)

      norm.loadData(function() {
      
        var toLoad = [];
        var that = this;

        for (var i = 0; i < files.length; i++) {
          if (files[i].match(/\.(ss)$/i)) {
            debug("Try to load", files[i])
            toLoad.push(files[i]);
          }
        }

        async.each(toLoad, parse(factSystem), function(){
          sortReplies();

          var tfidf = new TfIdf();
          for (var topicName in gKeywords) {
            if (gKeywords[topicName] != undefined) {
              var kw = gKeywords[topicName].join(" ");
              if (kw) {
                debug("Adding ", kw , "to doc");
                tfidf.addDocument(kw.tokenizeAndStem(), topicName);
              }
            }
          }

          var data = {
            gTopicFlags: topicFlags,
            gTopics: gTopics,
            gPrevTopics: gPrevTopics,
            gSorted: gSorted,
            keywords: JSON.stringify(tfidf)
          }

          
          console.log("Number of topics %s parsed.", Object.keys(topicFlags).length);
          console.log("Number of triggers %s parsed.", gTriggerCount);
          console.log("Number of replies %s parsed.", gReplyCount);

          if (data != "") {
            callback(null, data);  
          } else {
            callback(new Error("No data"));
          }
          
        });
      });
    });
  }

  return {
    loadDirectory: loadDirectory
  }
}

var parse = function(factSystem) {
  
  return function(fileName, callback) {
    var code = fs.readFileSync(fileName, 'utf-8');

    var that = this;
    var comment = false;
    
    var topic = "random";   // Initial Topic
    var ontrig  = "";       // The current trigger
    var repcnt  = 0;        // The reply counter
    var lineno  = 0;        // Line number for Warning Messages
    var lastcmd = "";       // Last command code
    var isPrevious  = "";   // Is a %Previous trigger
    var crcPrevTrigger = null;

    var lines = code.split("\n");
    var keywordRE = /(\([\w\s~]*\))/;
    var filterRE = /(\^\w+\([\w<>,\|\s]*\))/;

    // Add Random to topicFlags
    topicFlags[topic] = [];

    var lp = 0;
    var itor = function(line, next) {
      var cmd;
      lp++;
      lineno = lp;
      line = Utils.trim(line);

      // Look for comments.
      if (line.indexOf("//") == 0) {
        return next();
      } else if (line.indexOf("/*") == 0) {
        // Start of a multi-line comment.
        if (line.indexOf("*/") > -1) {
          // The end comment is on the same line!
          return next();
        }
        // In a multi-line comment.
        comment = true;
        return next();
      } else if (line.indexOf("*/") > -1) {
        // End of a multi-line comment.
        comment = false;
        return next();
      }

      // Line is a comment or empty
      if (comment || line.length === 0) {
        return next();
      }

      if (line.indexOf(" //") != -1) {
        line = Utils.trim(line.substring(0, line.indexOf(" //")));
      }

      // Separate the command from the data.
      if (line.length < 2) {
        dWarn("Weird single-character line '" + line + "' found", fileName, lineno);
        next();
      }

      cmd  = line.substring(0, 1);
      line = Utils.trim(line.substring(1));

      // Reset the %Previous state if this is a new +Trigger.
      if (cmd == 'H' || cmd == '+' || cmd == '?') {
        isPrevious = "";
      }

      // Do a lookahead for ^Continue and %Previous commands.
      for (var i = lp; i < lines.length; i++) {

        var lookahead = Utils.trim(lines[i]);
        if (lookahead.length < 2) {
          continue;
        }

        var lookCmd = lookahead.substring(0,1);
        lookahead = Utils.trim(lookahead.substring(1));

        // Only continue if the lookahead line has any data.
        if (lookahead.length != 0) {
          // The lookahead command has to be either a % or a ^.
          if (lookCmd != '^' && lookCmd != '%') {
            break;
          }

          // If the current command is a +, see if the following is a %.
          if (cmd == 'H' || cmd == '+' || cmd == '?') {
            if (lookCmd == '%') {

              crcPrevTrigger = crc.crc32(lookahead).toString(16);
              isPrevious = lookahead;
              break;
            } else {
              isPrevious = '';
            }
          }

          if (cmd == '!') {
            if (lookCmd == '^') {
              line += "<crlf>" + lookahead;
            }
            continue;
          }

          // If the current command is not a ^, and the line after is
          // not a %, but the line after IS a ^, then tack it on to the
          // end of the current line.
          if (cmd != '^' && lookCmd != '%') {
            if (lookCmd == '^') {
              line += lookahead;
            } else {
              break;
            }
          }
        }
      }

      switch(cmd) {
        case '^': next(); break;
        case '>':
          // > LABEL

          // Strip off Keywords and functions
          var m = [];
          var keywords = [];
          var filterFunction = false;

          if (filterRE.test(line)) {
            m = line.match(filterRE);
            filterFunction = m[1];
            line = line.replace(m[1], "");
          }

          if (keywordRE.test(line)) {
            m = line.match(keywordRE);
            keywords = m[1].replace("(","").replace(")","").split(" ");
            keywords = keywords.filter(function(i){return i});

            line = line.replace(m[1], "");
          }

          var temp   = Utils.trim(line).split(" ");
          var type   = temp.shift();
          var flags  = type.split(":");

          if (flags.length > 0) {
            type      = flags[0];
            var nflags = flags.shift();
          }
        
          debug("line: " + line + "; temp: " + temp + "; type: " + type + "; flags: " + flags + " keywords " + keywords);

          var name   = '';
          var fields = [];
          if (temp.length > 0) {
            name = temp.shift();
          }
          
          if (temp.length > 0) {
            fields = temp;
            debug("fields", fields);
            debug("temp", temp);
          }

          // Handle the label types. pre and post
          if (type === "pre" || type === "post") {
            debug("Found the " + type + " block.");
            name = "__" + type + "__";
            type = "topic";
            topicFlags[name] = ["keep"];
          }
          
          if (type == "topic") {

            if (!gKeywords[name]) {
              gKeywords[name] = [];
            }

            for (var i = 0; i < keywords.length; i++) {
              gKeywords[name].push(keywords[i]);
            }

            // Starting a new topic.
            debug("Set topic to " + name);
            ontrig = '';
            topic  = name;

            if (!topicFlags[topic]) {
              topicFlags[topic] = [];
            }

            debug("fields", fields);
            topicFlags[topic] = topicFlags[topic].concat(flags);
          }
          next();
          break;
        case '<':
          // < LABEL
          if (line == "topic" || line == "post" || line == "pre") {
            debug("End the topic label.");
            // Reset the topic back to random
            topic = "random";
          }
          next();
          break;
        case "H":
        case "?":
        case "+":
          debug("Trigger Found", line);
          gTriggerCount += 1;

          line = norm.clean(line);
          var crcTrigger = crc.crc32(((cmd === "?")?"?":"") + line).toString(16);
          var qSubType = false;
          var qType = false;

          var filterFunction = false;

          if (filterRE.test(line)) {
            m = line.match(filterRE);
            filterFunction = m[1];
            line = Utils.trim(line.replace(m[1], ""));
          }

          var nextSym = line.substring(0,1);
          if (nextSym == ":") {          
            var sp = line.indexOf(" ");
            var cd = line.substring(0, sp);
            
            line = Utils.trim(line.substring(sp));
            var p = cd.split(":");
            var parts = [];
            for (var i = 0; i < p.length; i++) {
              if (p[i].length == 2) {
                qSubType = p[i];
              } else {
                if (p[i] != "") {
                  parts.push(p[i]);
                  qType = p[i];
                } else {
                  qType = false;
                }
              }
            }
            qType = (!_.isEmpty(parts)) ? parts.join(":") : false;
          }
        
          var trigOptions = {
            isQuestion : (cmd === "?") ? true : false,
            qType : qType,
            qSubType : qSubType,
            filter: filterFunction 
          }

          regexreply.parse(line, factSystem, function(regexp) {
            
            if (isPrevious.length > 0) {
              _initTopicTree(crcTrigger, 'thats', topic, regexp, crcPrevTrigger, trigOptions);
            } else {
              _initTopicTree(crcTrigger, 'topics', topic, regexp, trigOptions);
            }

            ontrig = crcTrigger; 
            repcnt = 0;
            next();          
          });

          break;
        case "*":
          debug("Bot Topic:", line);
          var options = {};

          // We also support 
          // *:1 and *:2 These are special messages
          var nextSym = line.substring(0,1);
          if (nextSym == ":") {          
            var sp = line.indexOf(" ");
            var messageCount = line.substring(1, sp);
            line = Utils.trim(line.substring(sp));
            options.index = messageCount;
          }

          var crcTrigger = crc.crc32(line).toString(16);
          _initTopicTree(crcTrigger, 'botTopics', topic, line, null, options);

          next();
          break;
        case "R":
        case "-":
          if (ontrig == '') {
            dWarn("Response found before trigger", fileName, lineno);
            gBotTopics[topic]
            next();
            break;
          }
          debug("Response:", line);

          gReplyCount += 1;
          if (isPrevious.length > 0) {
            gPrevTopics[topic][crcPrevTrigger][ontrig]['reply'][repcnt] = line;
          } else {
            // The Reply should have a reference to the spoken trigger
            var replyID = crc.crc32(line).toString(16);
            gTopics[topic][ontrig]['reply'][replyID] = line;
          }
          repcnt++;
          next();
          break;
        case '@':
          // @ REDIRECT
          debug("Redirect response to: " + line);
          if (isPrevious.length > 0) {
            gPrevTopics[topic][isPrevious][ontrig]['redirect'] = Utils.trim(line);
          } else {
            gTopics[topic][ontrig]['redirect'] = Utils.trim(line);
          }
          next();
          break;
          case '%': next(); break;
        default:
          dWarn("Unknown Command: '" + cmd + "'", fileName, lineno);
          next();
          break;
      }
    }

    async.eachSeries(lines, itor, function(err, res){
      callback(err, res);
    });
  }
}

var _initTopicTree = function (crcTrigger, toplevel, topic, trigger, what, options) {

  if (toplevel == "topics") {
    if (!gTopics[topic]) {
      gTopics[topic] = {};
    }

    if (!gTopics[topic][crcTrigger]) {
      gTopics[topic][crcTrigger] = {
        'trigger': trigger,
        'options': what,
        'reply':     {},
        'redirect':  undefined
      };
    }
  } else if (toplevel == "thats") {

    if (!gPrevTopics[topic]) {
      gPrevTopics[topic] = {};
    }
    if (!gPrevTopics[topic][what]) {
      gPrevTopics[topic][what] = {};
    }

    if (!gPrevTopics[topic][what][crcTrigger]) {
      gPrevTopics[topic][what][crcTrigger] = {
        'trigger': trigger,
        'reply':     {},
        'options': options,
        'redirect':  undefined
      };
    }
  } else if (toplevel == "botTopics") {
    if (!gTopics[topic]) {
      gTopics[topic] = {};
    }

    if (!gTopics[topic][crcTrigger]) {
      gTopics[topic][crcTrigger] = {
        'say': trigger,
        'trigger': null,
        'options': options,
        'reply':     {},
        'redirect':  undefined
      };
    }

  }
};

var sortReplies = function(thats) {

  var triglvl, sortlvl;
  if (thats !== undefined) {
    debug("Sorting Previous Topics");
    triglvl = gPrevTopics;
    sortlvl = 'thats';
  } else {
    debug("Sorting Topics");
    triglvl = gTopics;
    sortlvl = 'topics';
  }

  // (Re)initialize the sort cache.
  gSorted[sortlvl] = {};
  debug("Sorting triggers...");

  var sorter = new Sort(gTopics, gPrevTopics, gIncludes, gLineage);

  for (var topic in triglvl) {
    debug("Analyzing topic " + topic);

    var alltrig = sorter.topicTriggers(topic, triglvl);
    // debug("ALLTRIG", alltrig, triglvl);
    var running = sorter._sortTriggerSet(alltrig);

    // Save this topic's sorted list.
    if (!gSorted[sortlvl]) {
      gSorted[sortlvl] = {};
    }

    gSorted[sortlvl][topic] = running;
  }

  // And do it all again for %Previous!
  if (thats == undefined) {
    // This will set the %Previous lines to best match the bot's last reply.
    sortReplies(true);

    // If any of the %Previous's had more than one +Trigger for them,
    // this will sort all those +Triggers to pair back to the best human
    // interaction.
    gSorted = sorter.sortPrevTriggers(gSorted, gPrevTopics);
  }
}

var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};