var fs = require("fs");
var async = require("async");
var Utils = require("../lib/utils");
var sort = require("../lib/sort");
var debug = require("debug")("Parse");
var dWarn = require("debug")("Parse:Warn");
var norm = require("node-normalizer");
var crc = require('crc');
var regexreply = require("./regexreply");


var topicFlags = {};
var gTopics = {};
var gPrevTopics = {};
var gSorted = {};
var gIncludes = {};
var gLineage = {};

exports.loadDirectory = function(path, callback) {
  try {
    var files = fs.readdirSync(path);
  } catch(error) {
    dWarn("Error Loading Topics", error);
    return callback(error, null);
  }
  
  norm.loadData(function() {
  
    var toLoad = [];
    var that = this;

    for (var i = 0; i < files.length; i++) {
      if (files[i].match(/\.(ss)$/i)) {
        toLoad.push(path + "/" + files[i]);
      }
    }

    async.each(toLoad, parse, function(){
      sortReplies();

      var data = {
        gTopicFlags: topicFlags,
        gTopics: gTopics,
        gPrevTopics: gPrevTopics,
        gSorted: gSorted
      }

      callback(null, data);
    });
  });
}

var parse = function(fileName, callback) {
  var code = fs.readFileSync(fileName, 'utf-8');

  var that = this;
  var comment = false;
  
  var topic = "random";   // Initial Topic
  var ontrig  = "";       // The current trigger
  var repcnt  = 0;        // The reply counter
  var lineno  = 0;        // Line number for Warning Messages
  var lastcmd = "";       // Last command code
  var isPrevious  = "";   // Is a %Previous trigger

  var lines = code.split("\n");

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
        var temp   = Utils.trim(line).split(" ");
        var type   = temp.shift();
        var flags  = type.split(":");
        if (flags.length > 0) {
          type      = flags[0];
          var nflags = flags.shift();
        }
      
        debug("line: " + line + "; temp: " + temp + "; type: " + type + "; flags: " + flags);
        var name   = '';
        var fields = [];
        if (temp.length > 0) {
          name = temp.shift();
        }
        if (temp.length > 0) {
          fields = temp;
        }

        // Handle the label types.
        if (type == "begin") {
          // The BEGIN block.
          debug("Found the BEGIN block.");
          type = "topic";
          name = "__begin__";

          // This topic is hard-coded to keep
          topicFlags["__begin__"] = ["keep"];
        }
        if (type == "topic") {
          // Starting a new topic.
          debug("Set topic to " + name);
          ontrig = '';
          topic  = name;

          if (!topicFlags[topic]) {
            topicFlags[topic] = [];
          }

          debug("fields", fields);
          topicFlags[topic] = topicFlags[topic].concat(flags);

          // This needs to be improved + tested
          // Does this topic include or inherit another one?
          var mode = ''; // or 'inherits' or 'includes'
          if (fields.length >= 2) {

            for (var i = 0; i < fields.length; i++) {
              var field = fields[i];

              if (field == "includes" || field == "inherits") {
                mode = field;
              } else if (mode != '') {
                // This topic is either inherited or included.
                if (mode == "includes") {
                  if (!gIncludes[name]) {
                    gIncludes[name] = {};
                  }
                  gIncludes[name][field] = 1;
                } else {
                  if (!gLineage[name]) {
                    gLineage[name] = {};
                  }
                  gLineage[name][field] = 1;
                }
              }
            }
          }
        }
        next();
        break;
      case '<':
        // < LABEL
        if (line == "begin" || line == "topic") {
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
        line = norm.clean(line);
        var crcTrigger = crc.crc32(((cmd === "?")?"?":"") + line).toString(16);
        var qSubType = false;
        var qType = false;

        var nextSym = line.substring(0,1);
        if (nextSym == ":") {          
          var sp = line.indexOf(" ");
          var cd = line.substring(0, sp);
          line = Utils.trim(line.substring(sp));
          var p = cd.split(":");
          for (var i = 0; i < p.length; i++) {
            if (p[i].length == 2) { 
              qSubType = p[i];
            } else {
              if (p[i] != "") {
                qType = p[i];  
              } else {
                qType = false;
              }
            }
          }
        }
      
        var trigOptions = {
          isQuestion : (cmd === "?") ? true : false,
          qType : qType,
          qSubType : qSubType
        }

        regexreply.parse(line, function(regexp) {
          
          if (isPrevious.length > 0) {
            debug("IS PREV", isPrevious)
            debug("IS PREV1", regexp)
            _initTopicTree(crcTrigger, 'thats', topic, isPrevious, regexp, trigOptions);
          } else {
            _initTopicTree(crcTrigger, 'topics', topic, regexp, trigOptions);
          }

          ontrig = crcTrigger; 
          repcnt = 0;
          next();          
        });

        break;
      case "R":
      case "-":
        if (ontrig == '') {
          dWarn("Response found before trigger", fileName, lineno);
          next();
          break;
        }
        debug("Response:", line);

        if (isPrevious.length > 0) {
          debug("---", gPrevTopics[topic]);
          gPrevTopics[topic][isPrevious][ontrig]['reply'][repcnt] = line;
        } else {
          gTopics[topic][ontrig]['reply'][repcnt] = line;
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
    }
  }

  async.eachSeries(lines, itor, function(err, res){
    console.log(err, res)
    callback(err, res);
  });
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
    if (!gPrevTopics[topic][crcTrigger]) {
      debug("----", topic, crcTrigger)
      gPrevTopics[topic][crcTrigger] = {};
    }

    debug("WHAT", what);

    if (!gPrevTopics[topic][crcTrigger][what]) {
      gPrevTopics[topic][crcTrigger][what] = {
        'trigger': trigger,
        'reply':     {},
        'redirect':  undefined
      };
    }
  }
};

var sortReplies = function(thats) {

  var triglvl, sortlvl;
  if (thats != undefined) {
    triglvl = gPrevTopics;
    sortlvl = 'thats';
  } else {

    triglvl = gTopics;
    sortlvl = 'topics';
  }

  // (Re)initialize the sort cache.
  gSorted[sortlvl] = {};
  debug("Sorting triggers...");

  var sorter = new Sort(gIncludes, gLineage);

  for (var topic in triglvl) {
    debug("Analyzing topic " + topic);
    // TODO, pass in the triggers or change reference.

    var alltrig = sorter.topic_triggers(topic, triglvl);
    // debug("ALLTRIG", alltrig, triglvl);
    var running = sorter._sort_trigger_set(alltrig);

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
    gSorted = sorter._sort_that_triggers(gSorted, gPrevTopics);
  }

}