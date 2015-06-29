var Utils = require("../utils");
var async = require("async");
var regexreply = require("./regexreply");
var debug = require("debug")("ParseContents");
var dWarn = require("debug")("ParseContents:Warn");
var _ = require("underscore");


// Strip all comments
var _stripComment = function (code) {
  var MULTILINE_COMMENT = /\/\*[^!][\s\S]*?\*\/\n/gm;
  var SINGLELINE_COMMENT = /^\s*\t*(\/\/)[^\n\r]*[\n\r]/gm;
  code = code.replace(MULTILINE_COMMENT, "");
  code = code.replace(SINGLELINE_COMMENT, "");
  return code;
};

var _cleanRaw = function (code) {
  var codeNoComments = _stripComment(code);
  var lines = codeNoComments.split("\n");
  var cleanCode = _.map(lines, function (raw) {
    return Utils.trim(raw);
  }).filter(function (line) {
    return line.length > 0;
  });

  return cleanCode;
};

var _searchMiniTopic = function (cursor, cmd, instructions) {
  var result = {
    line: null,
    isPrevious: null
  };

  for (var i = cursor; i < instructions.length; i++) {
    var lookahead = Utils.trim(instructions[i]);
    if (lookahead.length < 2) {
      continue;
    }

    var lookCmd = lookahead.substring(0, 1);
    lookahead = Utils.trim(lookahead.substring(1));
    // Only continue if the lookahead line has any data.
    if (lookahead.length !== 0) {
      // If the current command is a +, see if the following is a %.
      if (cmd === "+" || cmd === "?") {
        if (lookCmd === "%") {
          result.isPrevious = lookahead;
          break;
        } else {
          result.isPrevious = null;
        }
      }

      // If the current command is not a ^, and the line after is
      // not a %, but the line after IS a ^, then tack it on to the
      // end of the current line.
      if (cmd !== "^" && lookCmd !== "%") {
        if (lookCmd === "^") {
          result.line = result.line === null ? lookahead : result.line + lookahead;
        } else {
          break;
        }
      }
    }
  }
  return result;
};

// var _initGambitTree = function (topicName, idTrigger, regexp, raw, options, kindTopic) {
var _initGambitTree = function (options) {

  var gambit = {};
  gambit[options.idTrigger] = {
    topic: options.topicName,
    options: options.options,
    replys: [],
    redirect: null,
    trigger: options.regexp
  };

  if (options.raw !== null) {
    gambit[options.idTrigger].raw = options.raw;
  }

  if (options.kindTopic === "botTopics") {
    gambit[options.idTrigger].say = options.regexp;
    gambit[options.idTrigger].trigger = null;
  }

  return gambit;
};

module.exports = function (norm) {
  return function (code, factSystem, callback) {

    var KEYWORD_RE = /(\([\w\s~]*\))/;
    var FILTER_RE = /(\^\w+\([\w<>,\|\s]*\))/;
    var TOPIC_RANDOM_NAME = "random";
    var topicName = TOPIC_RANDOM_NAME;   // Initial Topic
    var currentTrigger = null;           // The current trigger
    var miniTopic = {
      line: null,
      isPrevious: null
    };
    var lineCursor = 0;
    var topics = {};
    var gambits = {};
    var replys = {};

    // Initialise Random topic
    topics[topicName] = {
      flags: [],
      keywords: []
    };

    var getFilterFunction = function (input) {
      if (FILTER_RE.test(input)) {
        var m = input.match(FILTER_RE);
        input = Utils.trim(input.replace(m[1], ""));
        return m[1];
      } else {
        return false;
      }
    };

    var getKeywords = function (input) {
      if (KEYWORD_RE.test(input)) {
        m = input.match(KEYWORD_RE);
        keywords = m[1].replace("(", "").replace(")", "").split(" ");
        input = input.replace(m[1], "");
        return keywords.filter(function (x) {
          return x;
        });
      } else {
        return [];
      }
    };

    var _processLabelStartCMD = function (line, callback) {
      // > LABEL
      // Strip off Keywords and functions
      var m = [];
      var keywords = getKeywords(line);
      filterFunction = getFilterFunction(line);
      var temp = Utils.trim(line).split(" ");
      var type = temp.shift();
      var flags = type.split(":");
      var name = "";

      if (flags.length > 0) {
        type = flags.shift();
      }

      if (temp.length > 0) {
        name = temp.shift();
      }

      // Handle the label types. pre and post
      if (type === "pre" || type === "post") {
        debug("Found the " + type + " block.");
        name = "__" + type + "__";
        type = "topic";
        if (!topics[name]) {
          topics[name] = {
            flags: [],
            keywords: []
          };
        }
        topics[name].flags.push("keep");
      } else if (type === "topic") {
        if (!topics[name]) {
          topics[name] = {
            flags: [],
            keywords: []
          };
        }
        for (var i = 0; i < keywords.length; i++) {
          topics[name].keywords.push(keywords[i]);
        }
        // Starting a new topic.
        debug("Set topic to " + name);
        currentTrigger = null;
        topicName = name;
        if (_.isArray(flags) && flags.length === 1) {
          flags = _.first(flags);
          flags = flags.split(",");
        }
        topics[name].flags = topics[name].flags.concat(flags);
      } else {
        dWarn("Unknown topic type: " + type + " at " + lineCursor);
      }
      callback();
    };

    var _processLabelEndCMD = function (line, next) {
      // < LABEL
      if (line === "topic" || line === "post" || line === "pre") {
        debug("End the topic label.");
        topicName = TOPIC_RANDOM_NAME;
      }
      next();
    };

    var filterFunction = false;
    var instructions = _cleanRaw(code);

    var instructionsItor = function (raw, nextInstruction) {
      var line = raw;
      debug("Process Line: " + line);

      var cmd = null;
      lineCursor++;

      if (line.length < 2) {
        dWarn("Weird single-character line '" + line + "' found", lineCursor);
        return nextInstruction();
      }

      // Separate the command from the data.
      cmd = line.substring(0, 1);
      line = Utils.trim(line.substring(1));
      debug("Cmd Extracted: " + cmd);
      debug("Line Extracted: " + line);

      // Reset the %Previous state if this is a new +Trigger.
      if (cmd === "H" || cmd === "+" || cmd === "?") {
        miniTopic.isPrevious = null;
      }

      // Do a lookahead for ^Continue and %Previous commands.
      miniTopic = _searchMiniTopic(lineCursor, cmd, instructions);
      if (miniTopic.line !== null) {
        line += miniTopic.line;
      }

      switch (cmd) {
        case "?":
        case "+":
          debug("Trigger Found: " + line);
          line = norm.clean(line);

          var idTrigger = Utils.genId();
          var qSubType = false;
          var qType = false;
          var m = [];
          filterFunction = getFilterFunction(line);

          // if (FILTER_RE.test(line)) {
          //   m = line.match(FILTER_RE);
          //   filterFunction = m[1];
          //   line = Utils.trim(line.replace(m[1], ""));
          // }

          var nextSym = line.substring(0, 1);
          if (nextSym === ":") {
            var sp = line.indexOf(" ");
            var cd = line.substring(0, sp);

            line = Utils.trim(line.substring(sp));
            var p = cd.split(":");
            var parts = [];
            for (var i = 0; i < p.length; i++) {
              if (p[i].length === 2) {
                qSubType = p[i];
              } else if (p[i] !== "") {
                parts.push(p[i]);
                qType = p[i];
              } else {
                qType = false;
              }
            }
            qType = !_.isEmpty(parts) ? parts.join(":") : false;
          }

          var trigOptions = {
            isQuestion: cmd === "?" ? true : false,
            qType: qType,
            qSubType: qSubType,
            filter: filterFunction
          };

          regexreply.parse(line, factSystem, function (regexp) {
            var done = function () {
              currentTrigger = idTrigger;
              nextInstruction();
            };

            if (miniTopic.isPrevious !== null) {
              debug("isPrevious found.");

              var convs = _.map(replys, function (reply, id) {
                var idFound;
                regexreply.parse(miniTopic.isPrevious, factSystem, function (regexpp) {
                  if (reply.match(regexpp) !== null || miniTopic.isPrevious === reply) {
                    idFound = id;
                    return;
                  }
                });
                return idFound;
              });
              convs = _.compact(convs);
              if (convs.length > 0) {
                trigOptions.conversations = convs;
              }
            }

            var opt = {
              topicName: topicName,
              idTrigger: idTrigger,
              regexp: regexp,
              raw: line,
              options: trigOptions,
              kindTopic: null
            };

            var gambit = _initGambitTree(opt);
            if (_.size(gambit) > 0) {
              currentTrigger = idTrigger;
              gambits = _.extend(gambits, gambit);
            }

            return done();
          });

          break;
        case "-":
          if (currentTrigger === "") {
            dWarn("Response found before trigger: " + lineCursor);
            nextInstruction();
            break;
          }
          debug("Response: " + line);
          idTrigger = Utils.genId();
          replys[idTrigger] = line;
          gambits[currentTrigger].replys.push(idTrigger);
          nextInstruction();
          break;
        case "@":
          if (currentTrigger === "") {
            dWarn("Response found before trigger: " + lineCursor);
            nextInstruction();
            break;
          }
          debug("Redirect response to: " + line);

          gambits[currentTrigger].redirect = Utils.trim(line);
          nextInstruction();
          break;

        case ">": _processLabelStartCMD(line, nextInstruction); break;
        case "<": _processLabelEndCMD(line, nextInstruction); break;

        // case "*":
        //   debug("Bot Topic: ", line);
        //   var options = {};
        //   // We also support
        //   // *:1 and *:2 These are special messages
        //   var nextSym2 = line.substring(0, 1);
        //   if (nextSym2 === ":") {
        //     var sp2 = line.indexOf(" ");
        //     var messageCount = line.substring(1, sp2);
        //     line = Utils.trim(line.substring(sp2));
        //     options.index = messageCount;
        //   }
        //   idTrigger = Utils.genId();
        //   var opt = {
        //     topicName: topicName,
        //     idTrigger: idTrigger,
        //     regexp: line,
        //     raw: null,
        //     options: options,
        //     kindTopic: "botTopics"
        //   };
        //   var gambit = _initGambitTree(opt);
        //   if (_.size(gambit) > 0) {
        //     gambits = _.extend(gambits, gambit);
        //   }
        //   nextInstruction();
        //   break;
        case "%": nextInstruction(); break;
        case "^": nextInstruction(); break;
        default:
          dWarn("Unknown Command: " + cmd + " at " + lineCursor);
          nextInstruction();
          break;
      }
    };

    debug("Number of instructions: " + instructions.length);
    async.eachSeries(instructions, instructionsItor, function () {
      var data = {
        topics: topics,
        gambits: gambits,
        replys: replys
      };
      callback(null, data);
    });

  };
};
