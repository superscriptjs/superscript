var Utils = require("../utils");
var async = require("async");
var regexreply = require("./regexreply");
var debug = require("debug")("ParseContents");
var dWarn = require("debug")("ParseContents:Warn");
var _ = require("underscore");



module.exports = function(norm) {
  return function(code, factSystem, callback) {

    var topicFlags = {};
    var gTopics = {};
    var gPrevTopics = {};
    var gKeywords = {};
    var gIncludes = {};
    var gLineage = {};

    var gTriggerCount = 0;
    var gReplyCount = 0;

    var that = this;
    var comment = false;

    var topic = "random";   // Initial Topic
    var ontrig  = "";       // The current trigger
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
      if (comment || line.length === 0) return next();
      if (line.indexOf(" //") != -1) line = Utils.trim(line.substring(0, line.indexOf(" //")));

      // Separate the command from the data.
      if (line.length < 2) {
        dWarn("Weird single-character line '" + line + "' found", lineno);
        return next();
      }

      debug('Process line: ' + line);

      cmd  = line.substring(0, 1);
      line = Utils.trim(line.substring(1));

      debug('cmd: ' + cmd);
      debug('line: ' + line);

      // Reset the %Previous state if this is a new +Trigger.
      if (cmd === 'H' || cmd === '+' || cmd === '?') isPrevious = "";

      // Do a lookahead for ^Continue and %Previous commands.
      for (var i = lp; i < lines.length; i++) {
        var lookahead = Utils.trim(lines[i]);
        if (lookahead.length < 2) continue;

        var lookCmd = lookahead.substring(0,1);
        lookahead = Utils.trim(lookahead.substring(1));

        debug('lookahead - Process line: ' + lines[i]);
        debug('lookahead - lookCmd: ' + lookCmd);
        debug('lookahead - lookahead: ' + lookahead);

        // Only continue if the lookahead line has any data.
        if (lookahead.length != 0) {
          // The lookahead command has to be either a % or a ^.
          if (lookCmd != '^' && lookCmd != '%') {
            debug('lookahead skip');
            break;
          }

          // If the current command is a +, see if the following is a %.
          if (cmd === 'H' || cmd === '+' || cmd === '?') {
            if (lookCmd === '%') {
              crcPrevTrigger = Utils.genId();
              isPrevious = lookahead;
              break;
            } else {
              isPrevious = '';
            }
          }

          if (cmd === '!') {
            if (lookCmd === '^') {
              line += "<crlf>" + lookahead;
            }
            continue;
          }

          // If the current command is not a ^, and the line after is
          // not a %, but the line after IS a ^, then tack it on to the
          // end of the current line.
          if (cmd != '^' && lookCmd != '%') {
            if (lookCmd === '^') {
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
          debug("Trigger Found: ", line);
          gTriggerCount += 1;

          line = norm.clean(line);
          var crcTrigger = Utils.genId();
          var qSubType = false;
          var qType = false;

          var filterFunction = false;

          if (filterRE.test(line)) {
            m = line.match(filterRE);
            filterFunction = m[1];
            line = Utils.trim(line.replace(m[1], ""));
          }

          var nextSym = line.substring(0,1);
          if (nextSym === ":") {
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
            var done = function () {
              ontrig = crcTrigger;
              next();
            };

            if (isPrevious.length > 0) {
              var ontrigReplys;
              if(!_.isUndefined(gTopics[topic][ontrig])) {
                ontrigReplys = gTopics[topic][ontrig].reply;
              } else {
                var flatPrevTopics = _.object(_.map(gPrevTopics[topic], function (num, key) {
                    return [Object.keys(num), _.first(_.values(num))];
                }));
                if(!_.isUndefined(flatPrevTopics[ontrig])) {
                  ontrigReplys = flatPrevTopics[ontrig].reply;
                }
              }
              if(!_.isObject(ontrigReplys)) {
                dWarn('something wrong with prev topics!');
                return done();
              }

              var eachReplyTopicItor = function(replyParent, next) {
                var sentence = ontrigReplys[replyParent];
                // TODO: support wildcard and/or something like regex (- who is there? == % who is *)
                if(isPrevious === sentence) {
                  crcPrevTrigger = replyParent;
                  gPrevTopics = _initTopicTree(gTopics, gPrevTopics, crcTrigger, 'thats', topic, regexp, replyParent, trigOptions);
                  if (gPrevTopics[topic][crcTrigger]) {
                    gPrevTopics[topic][crcTrigger].raw = line;
                  }
                }
                next();
              };

              async.each(Object.keys(ontrigReplys), eachReplyTopicItor, function(){
                done();
              });

            } else {
              gTopics = _initTopicTree(gTopics, gPrevTopics, crcTrigger, 'topics', topic, regexp, trigOptions);
              if (gTopics[topic][crcTrigger]) {
                gTopics[topic][crcTrigger].raw = line;
              }
              done();
            }

          });

          break;
        case "*":
          debug("Bot Topic: ", line);
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

          var crcTrigger = Utils.genId();
          gTopics = _initTopicTree(gTopics, gPrevTopics, crcTrigger, 'botTopics', topic, line, null, options);

          next();
          break;
        case "R":
        case "-":
          if (ontrig == '') {
            dWarn("Response found before trigger: ", lineno);
            gBotTopics[topic]
            next();
            break;
          }
          debug("Response: ", line);

          gReplyCount += 1;
          if (isPrevious.length > 0) {
            var replyID = Utils.genId();
            gPrevTopics[topic][crcPrevTrigger][ontrig]['reply'][replyID] = line;
          } else {
            // The Reply should have a reference to the spoken trigger
            var replyID = Utils.genId();
            gTopics[topic][ontrig]['reply'][replyID] = line;
          }
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
          dWarn("Unknown Command: '" + cmd + "'", lineno);
          next();
          break;
      }
    }

    debug('Number of lines: ' + lines.length);
    async.eachSeries(lines, itor, function(){
      var data = {
        topicFlags: topicFlags,
        gTopics: gTopics,
        gPrevTopics: gPrevTopics,
        gKeywords: gKeywords,
        gTriggerCount: gTriggerCount,
        gReplyCount: gReplyCount
      };
      callback(null, data);
    });

  }
}

var _initTopicTree = function (gTopics, gPrevTopics, crcTrigger, toplevel, topic, trigger, what, options) {

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
    return gTopics;
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

    return gPrevTopics;

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

    return gTopics;
  }
};