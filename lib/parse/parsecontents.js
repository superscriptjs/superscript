var Utils = require("../utils");
var async = require("async");
var regexreply = require("./regexreply");
var debug = require("debug")("ParseContents");
var dWarn = require("debug")("ParseContents:Warn");
var dSearchMiniTopic = require("debug")("ParseContents:_searchMiniTopic");
var _ = require("underscore");


// Strip all comments
var _stripComment = function (code) {
    var MULTILINE_COMMENT = /\/\*[^!][\s\S]*?\*\/\n/gm;
    var SINGLELINE_COMMENT = /^\s*\t*(\/\/)[^\n\r]*[\n\r]/gm;
    code = code.replace(MULTILINE_COMMENT, '');
    code = code.replace(SINGLELINE_COMMENT, '');
    return code;
};
var _cleanRaw = function(code) {
    var codeNoComments = _stripComment(code);
    var lines = codeNoComments.split("\n");
    var cleanCode = _.map(lines, function(raw){
      return Utils.trim(raw);
    }).filter(function(line){ return line.length > 0; });

    return cleanCode;
};


var _searchMiniTopic = function(cursor, cmd, instructions) {
    var result = {
      line: null,
      isPrevious: null
    };

    for (var i = cursor; i < instructions.length; i++) {
      var lookahead = Utils.trim(instructions[i]);
      if (lookahead.length < 2) continue;
      var lookCmd = lookahead.substring(0, 1);
      lookahead = Utils.trim(lookahead.substring(1));
      dSearchMiniTopic('_searchMiniTopic - Process line: ' + instructions[i]);
      dSearchMiniTopic('_searchMiniTopic - lookCmd: ' + lookCmd + ' (' + cmd + ')');
      dSearchMiniTopic('_searchMiniTopic - lookahead: ' + lookahead);
      // Only continue if the lookahead line has any data.
      if (lookahead.length !== 0) {
        // If the current command is a +, see if the following is a %.
        if (cmd === '+' || cmd === '?') {
          if (lookCmd === '%') {
            result.isPrevious = lookahead;
            break;
          } else {
            result.isPrevious = null;
          }
        }

        // If the current command is not a ^, and the line after is
        // not a %, but the line after IS a ^, then tack it on to the
        // end of the current line.
        if (cmd != '^' && lookCmd != '%') {
          if (lookCmd === '^') {
            result.line = lookahead;
          } else {
            break;
          }
        }
      }
    }
    return result;
};

module.exports = function(norm) {
  return function(code, factSystem, callback) {

    var KEYWORD_RE = /(\([\w\s~]*\))/;
    var FILTER_RE = /(\^\w+\([\w<>,\|\s]*\))/;
    var TOPIC_RANDOM_NAME = 'random';

    var root = this;
    var comment = false;
    var topicName = TOPIC_RANDOM_NAME;   // Initial Topic
    var currentTrigger  = null;       // The current trigger
    // var currentPrevTrigger = null;
    var lastCmd = null;       // Last command code
    //var isPrevious  = null;   // Is a %Previous trigger
    var miniTopic = {
      line: null,
      isPrevious: null
    };
    var lineCursor = 0;

    var topics = {};
    var gambits = {};
    var replys = {};

    //initialise Random topic
    topics[topicName] = {
      flags: [],
      keywords: []
    };

    var instructions = _cleanRaw(code);
    var instructionsItor = function(raw, nextInstruction) {
      //line = Utils.trim(raw);
      var line = raw;
      debug('Process Line: ' + line);

      var cmd = null;
      lineCursor++;

      if (line.length < 2) {
        dWarn("Weird single-character line '" + line + "' found", lineCursor);
        return nextInstruction();
      }

      // Separate the command from the data.
      cmd  = line.substring(0, 1);
      line = Utils.trim(line.substring(1));
      debug('Cmd Extracted: ' + cmd);
      debug('Line Extracted: ' + line);

      // Reset the %Previous state if this is a new +Trigger.
      if (cmd == 'H' || cmd == '+' || cmd == '?') miniTopic.isPrevious = null;

      // Do a lookahead for ^Continue and %Previous commands.
      miniTopic = _searchMiniTopic(lineCursor, cmd, instructions);
      if(miniTopic.line !== null) line += miniTopic.line;

      switch(cmd) {
        case "?":
        case "+":
          debug('Trigger Found: ' + line);
          debug('isPrevious: ', miniTopic);
          line = norm.clean(line);

          var idTrigger = Utils.genId();
          var qSubType = false;
          var qType = false;
          var filterFunction = false;

          if (FILTER_RE.test(line)) {
            m = line.match(FILTER_RE);
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
                if (p[i] !== "") {
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
          };

          regexreply.parse(line, factSystem, function(regexp) {
            var done = function () {
              currentTrigger = idTrigger;
              nextInstruction();
            };

            var topic;
            if (miniTopic.isPrevious !== null) {
              debug('isPrevious found.');

              var convs = _.map(replys, function(reply, id){
                var idFound;
                regexreply.parse(miniTopic.isPrevious, factSystem, function(regexpp) {
                  if(reply.match(regexpp) !== null || miniTopic.isPrevious === reply) {
                    idFound = id;
                    return;
                  }
                });
                return idFound;
              });
              convs = _.compact(convs);
              if(convs.length > 0) trigOptions.conversations = convs;
            }

            gambit = _initGambitTree(topicName, idTrigger, regexp, line, trigOptions);
            if(_.size(gambit) > 0) {
              currentTrigger = idTrigger;
              gambits = _.extend(gambits, gambit);
            }

            return done();
          });

          break;
        case "-":
          if (currentTrigger === '') {
            dWarn('Response found before trigger: ' + lineCursor);
            nextInstruction();
            break;
          }
          debug('Response: ' + line);
          var idTrigger = Utils.genId();
          replys[idTrigger] = line;
          gambits[currentTrigger].replys.push(idTrigger);
          nextInstruction();
          break;
        case '@':
          if (currentTrigger === '') {
            dWarn('Response found before trigger: ' + lineCursor);
            nextInstruction();
            break;
          }
          debug("Redirect response to: " + line);

          gambits[currentTrigger].redirect = Utils.trim(line);
          nextInstruction();
          break;
        case '>':
          // > LABEL
          // Strip off Keywords and functions
          var m = [];
          var keywords = [];
          var filterFunction = false;

          if (FILTER_RE.test(line)) {
            m = line.match(FILTER_RE);
            filterFunction = m[1];
            line = line.replace(m[1], "");
          }

          if (KEYWORD_RE.test(line)) {
            m = line.match(KEYWORD_RE);
            keywords = m[1].replace("(","").replace(")","").split(" ");
            keywords = keywords.filter(function(i){return i;});
            line = line.replace(m[1], "");
          }

          var temp   = Utils.trim(line).split(" ");
          var type   = temp.shift();
          var flags  = type.split(":");

          if (flags.length > 0)  type = flags.shift();
          debug("line: " + line + "; temp: " + temp + "; type: " + type + "; flags: " + flags + " keywords: " + keywords);

          var name   = '';
          if (temp.length > 0)  name = temp.shift();
          if (temp.length > 0) dWarn('ExtraFields: \'' + fields + '\' at ' + lineCursor);

          // Handle the label types. pre and post
          if (type === "pre" || type === "post") {
            debug("Found the " + type + " block.");
            name = "__" + type + "__";
            type = "topic";
            if(!topics[name]) topics[name] = {flags:[], keywords: []};
            topics[name].flags.push('keep');

          } else if (type == "topic") {
            if(!topics[name]) topics[name] = {flags:[], keywords: []};

            for (var i = 0; i < keywords.length; i++) {
              topics[name].keywords.push(keywords[i]);
            }
            // Starting a new topic.
            // Starting a new topic.
            debug("Set topic to " + name);
            currentTrigger = null;
            topicName  = name;

            if(_.isArray(flags) && flags.length === 1) {
              flags = _.first(flags);
              flags = flags.split(',');
            }

            topics[name].flags = topics[name].flags.concat(flags);
          } else {
            dWarn('Unknown topic type: \'' + type + '\' at ' + lineCursor);
          }
          nextInstruction();
          break;
        case '<':
          // < LABEL
          if (line == "topic" || line == "post" || line == "pre") {
            debug("End the topic label.");
            // Reset the topic back to random
            topicName = TOPIC_RANDOM_NAME;
          }
          nextInstruction();
          break;
        case "*":
          debug("Bot Topic: ", line);
          var options = {};
          // We also support
          // *:1 and *:2 These are special messages
          var nextSym = line.substring(0,1);
          if (nextSym === ":") {
            var sp = line.indexOf(" ");
            var messageCount = line.substring(1, sp);
            line = Utils.trim(line.substring(sp));
            options.index = messageCount;
          }

          var idTrigger = Utils.genId();
          gambit = _initGambitTree(topicName, idTrigger, line, null, options, 'botTopics');
          if(_.size(gambit) > 0) {
            //currentTrigger = idTrigger;
            gambits = _.extend(gambits, gambit);
          }
          nextInstruction();
          break;
        case '%': nextInstruction(); break;
        case '^': nextInstruction(); break;
        default:
          dWarn('Unknown Command: \'' + cmd + '\' at ' + lineCursor);
          nextInstruction();
          break;
      }
    };

    debug('Number of instructions: ' + instructions.length);
    async.eachSeries(instructions, instructionsItor, function(){
      var data = {
        topics: topics,
        gambits: gambits,
        replys: replys
      };
      callback(null, data);
    });

  };
};

var _initGambitTree = function (topicName, idTrigger, regexp, raw, options, kindTopic) {

  var gambit = {};
  gambit[idTrigger] = {
    topic: topicName,
    options: options,
    replys: [],
    redirect: null,
    trigger: regexp
  };
  if(raw !== null) gambit[idTrigger].raw = raw;

  if(kindTopic === 'botTopics') {
    gambit[idTrigger].say = regexp;
    gambit[idTrigger].trigger = null;
  }

  return gambit;
};