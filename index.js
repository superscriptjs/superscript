var fs      = require("fs");
var rl      = require("readline");
var async   = require("async");
var qtypes  = require("qtypes");
var Message = require("./lib/message");
var Users   = require("./lib/users");
var getreply      = require("./lib/getreply");
var processTags   = require("./lib/processtags");
var reason        = require("./lib/reason/reason");
var concepts      = require("./lib/concepts");
var Sort    = require("./lib/sort");
var Utils   = require("./lib/utils");
var _       = require("underscore");
var norm    = require("node-normalizer");
var requireDir = require('require-dir');
var debug   = require("debug")("Script");
var dWarn   = require("debug")("Script:Warning");

function SuperScript(options) {

  var that = this;
  options = options || {};
  options.conceptnet = options.conceptnet || {host:'127.0.0.1', user:'root', pass:''}
  this.cnet     = require("conceptnet")(options.conceptnet);

  this.reasoning  = (options.reasoning === undefined) ? true : options.reasoning;

  this._users     = {}; // 'user' variables
  this._sorted    = {};
  this._thats     = {}; // Previous
  this._topics    = {}; // main reply structure
  this._topicFlags = {"random":[]}; 

  this._includes = {}; // included topics
  this._lineage  = {}; // inherited topics
  this._plugins  = [];
  
  var worldData = [
    './data/bot.tbl',
    './data/adjectivehierarchy.top',
    './data/adverbhierarchy.top',
    './data/affect.top',
    './data/concepts.top',
    './data/names.top',
    './data/oppisite_tiny.tbl',
    './data/prepositionhierarchy.top',
    './data/verbhierarchy.top',
    './data/world/animals.tbl',
    './data/world/color.tbl',
    './data/world/basicgeography.tbl'
  ]

  this._worldData = _.extend(options.worldData || {} , worldData)
  this.normalize = null;
  this.question  = null;

  this.loadPlugins("./plugins");
}

SuperScript.prototype.loadPlugins = function(path) {
  var plugins = requireDir(path);

  for (var file in plugins) {
    for (var func in plugins[file]) {
      this._plugins[func] = plugins[file][func];
    }
  }
}

SuperScript.prototype.loadDirectory = function(path, callback ) {
  
  try {
    var files = fs.readdirSync(path);
  } catch(error) {
    dWarn("Error Loading Topics", error);
    return callback(error, null);
  }
  
  var toLoad = [];
  var that = this;

  for (var i = 0; i < files.length; i++) {
    if (files[i].match(/\.(ss)$/i)) {
      toLoad.push(path + "/" + files[i]);
    }
  }

  concepts.readFiles(this._worldData, function(facts) {
    that.facts = facts;
  
    norm.loadData(function() {
      that.normalize = norm;

      var itor = function(item, next) {
        that._loadFile(item);
        next()
      }
      
      new qtypes(function(question) {
        async.each(toLoad, itor, function(){
          that.question = question;
          that.sortReplies();
          callback(null, that);
        });
      });
    });

  });
}

SuperScript.prototype.sortReplies = function(thats) {

  var triglvl, sortlvl;
  if (thats != undefined) {
    triglvl = this._thats;
    sortlvl = 'thats';
  } else {
    triglvl = this._topics;
    sortlvl = 'topics';
  }

  // (Re)initialize the sort cache.
  this._sorted[sortlvl] = {};
  debug("Sorting triggers...");

  var sorter = new Sort(this._includes, this._lineage);

  for (var topic in triglvl) {
    debug("Analyzing topic " + topic);

    var alltrig = sorter.topic_triggers(topic, triglvl);
    var running = sorter._sort_trigger_set(alltrig);

    // Save this topic's sorted list.
    if (!this._sorted[sortlvl]) {
      this._sorted[sortlvl] = {};
    }

    this._sorted[sortlvl][topic] = running;
  }

  // And do it all again for %Previous!
  if (thats == undefined) {
    // This will set the %Previous lines to best match the bot's last reply.
    this.sortReplies(true);

    // If any of the %Previous's had more than one +Trigger for them,
    // this will sort all those +Triggers to pair back to the best human
    // interaction.
    this._sorted = sorter._sort_that_triggers(this._sorted, this._thats);
  }

}

SuperScript.prototype._loadFile = function(file) {
  var that = this;  
  var contents = fs.readFileSync(file, 'utf-8');
  that.parse(file, contents);
}

SuperScript.prototype.parse = function(fileName, code) {
  var that = this;
  var comment = false;
  
  var topic = "random";   // Initial Topic
  var ontrig  = "";       // The current trigger
  var repcnt  = 0;        // The reply counter
  var concnt  = 0;        // The condition counter
  var lineno  = 0;        // Line number for Warning Messages
  var lastcmd = "";       // Last command code
  var isThat  = "";       // Is a %Previous trigger

  var lines = code.split("\n");

  for (var lp = 0; lp < lines.length; lp++) {
    var line = lines[lp];
    var cmd;
    lineno = lp + 1;
    line = Utils.trim(line);

    // Look for comments.
    if (line.indexOf("//") == 0) {
      continue;
    } else if (line.indexOf("/*") == 0) {
      // Start of a multi-line comment.
      if (line.indexOf("*/") > -1) {
        // The end comment is on the same line!
        continue;
      }
      // In a multi-line comment.
      comment = true;
      continue;
    } else if (line.indexOf("*/") > -1) {
      // End of a multi-line comment.
      comment = false;
      continue;
    }

    // Line is a comment or empty
    if (comment || line.length == 0) {
      continue;
    }

    if (line.indexOf(" //") != -1) {
      line = Utils.trim(line.substring(0, line.indexOf(" //")));
    }

    // Separate the command from the data.
    if (line.length < 2) {
      dWarn("Weird single-character line '" + line + "' found", fileName, lineno);
      continue;
    }

    cmd  = line.substring(0, 1);
    line = Utils.trim(line.substring(1));

    // Reset the %Previous state if this is a new +Trigger.
    if (cmd == 'H' || cmd == '+' || cmd == '?') {
      isThat = "";
    }

    // Do a lookahead for ^Continue and %Previous commands.
    for (var i = lp + 1; i < lines.length; i++) {

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
            isThat = lookahead;
            break;
          } else {
            isThat = '';
          }
        }

        // If the current command is a ! and the next command(s) are
        // ^, we'll tack each extension on as a line break (which is useful information for arrays).
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
      case '^': break;
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
          this._topicFlags["__begin__"] = ["keep"];
        }
        if (type == "topic") {
          // Starting a new topic.
          debug("Set topic to " + name);
          ontrig = '';
          topic  = name;

          if (!this._topicFlags[topic]) {
            this._topicFlags[topic] = [];
          }

          this._topicFlags[topic] = this._topicFlags[topic].concat(flags);
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
                  if (!this._includes[name]) {
                    this._includes[name] = {};
                  }
                  this._includes[name][field] = 1;
                } else {
                  if (!this._lineage[name]) {
                    this._lineage[name] = {};
                  }
                  this._lineage[name][field] = 1;
                }
              }
            }
          }
        }
        continue;
      case '<':
        // < LABEL
        if (line == "begin" || line == "topic") {
          debug("End the topic label.");
          // Reset the topic back to random
          topic = "random";
        }
        continue;
      case "H":
      case "?":
      case "+":
        debug("Trigger Found", line);
        line = that.normalize.clean(line);
        var qSubType = false;
        var nextSym = line.substring(0,1);
        if (nextSym == ":") {          
          // http://rubular.com/r/6ftUG3BONO
          var sp = line.indexOf(" ");
          var cd = line.substring(0, sp);
          line = Utils.trim(line.substring(sp));
          var p = cd.split(":");
          for (var i = 0; i < p.length; i++) {
            if (p[i].length == 2) { 
              qSubType = p[i];
            }
          }
        }
      

        var trigOptions = {
          isQuestion : (cmd === "?") ? true : false,
          qType : false,
          qSubType : qSubType
        }

        if (isThat.length > 0) {
          this._initTopicTree('thats', topic, isThat, line, trigOptions);
        } else {
          this._initTopicTree('topics', topic, line, trigOptions);
        }

        ontrig = line;
        repcnt = 0;
        concnt = 0;
        continue;

      case "R":
      case "-":
        if (ontrig == '') {
          dWarn("Response found before trigger", fileName, lineno);
          continue;
        }
        debug("Response:", line);

        if (isThat.length > 0) {
          this._thats[topic][isThat][ontrig]['reply'][repcnt] = line;
        } else {
          this._topics[topic][ontrig]['reply'][repcnt] = line;
        }
        repcnt++;
        continue;
      case '@':
        // @ REDIRECT
        debug("Redirect response to: " + line);
        if (isThat.length > 0) {
          this._thats[topic][isThat][ontrig]['redirect'] = Utils.trim(line);
        } else {
          this._topics[topic][ontrig]['redirect'] = Utils.trim(line);
        }
        continue;
        case '%':
          // % PREVIOUS
          continue; // This was handled above.
      default:
        dWarn("Unknown Command: '" + cmd + "'", fileName, lineno);
    }
  }
  return true;
}


SuperScript.prototype._initTopicTree = function (toplevel, topic, trigger, what, options) {
  if (toplevel == "topics") {

    if (!this._topics[topic]) {
      this._topics[topic] = {};
    }
    if (!this._topics[topic][trigger]) {
      this._topics[topic][trigger] = {
        'options': what,
        'reply':     {},
        'condition': {},
        'redirect':  undefined
      };
    }
  } else if (toplevel == "thats") {
    if (!this._thats[topic]) {
      this._thats[topic] = {};
    }
    if (!this._thats[topic][trigger]) {
      this._thats[topic][trigger] = {};
    }
    if (!this._thats[topic][trigger][what]) {
      this._thats[topic][trigger][what] = {
        'reply':     {},
        'condition': {},
        'redirect':  undefined
      };
    }
  }
};

var messageItorHandle = function(user, system) {
  return messageItor = function(msg, next) {
    var internalizeHandle = function(){
  
      var options = {
        user: user,
        type: "normal",
        system: system
      }

      if (system.topics["__begin__"]) {
        debug("Begin getreply");
        // TOOD - This needs to be callback diven
        options.message = new Message("request", system.question, system.normalize, system.cnet, system.facts);
        options.type = "begin";

        getreply(options,  function(err, begin){
          // Okay to continue?
          if (begin.indexOf("{ok}") > -1) {
            debug("Normal getreply");


            options.message = msg;
            options.type = "normal";

            getreply(options, function(err, reply2){
              if (err) { 
                next(err, null);
              } else {
                reply2 = begin.replace(/\{ok\}/g, reply2);  
                var pOptions = {
                  msg: msg, reply: reply2, 
                  stars: [], botstars:[],
                  user: user, 
                  system: system
                };
                processTags(pOptions, function(err, reply){
                  new Message(reply, system.question, system.normalize, system.cnet, system.facts, function(replyObj) {
                    user.updateHistory(msg, replyObj);
                    return next(err, reply);
                  });
                });
              }
            });
          } else {
            next(err, begin);
          }
        });
        
      } else {
        debug("Normal getreply");
        options.message = msg;
        options.type = "normal";

        getreply(options, function(err, reply){
          new Message(reply, system.question, system.normalize, system.cnet, system.facts, function(replyObj) {
            user.updateHistory(msg, replyObj);
            return next(err, reply);
          });
        });
      }
    }

    // We have an option to completly disable reasoning entirly.
    if (system.reasoning) {
      reason.internalizeMessage(msg, user, system.facts, system.cnet, internalizeHandle);
    } else {
      internalizeHandle();
    }
  }
}

// This takes a message and breaks it into chucks to be passed though 
// the sytem. We put them back together on the other end.
var messageFactory = function(rawMsg, question, normalize, cnet, facts, cb) {

  rawMsg = normalize.clean(rawMsg).trim();
  var messageParts = Utils.sentenceSplit(rawMsg);
  messageParts = Utils.cleanArray(messageParts);

  var itor = function(messageChunk, next) {
    new Message(messageChunk.trim(), question, normalize, cnet, facts, function(tmsg) {
      next(null, tmsg); 
    });
  }

  return async.mapSeries(messageParts, itor, function(err, messageArray) {
    return cb(messageArray);
  })
}

// Convert msg into message object, then check for a match
SuperScript.prototype.reply = function(userName, msg, callback) {
  if (arguments.length == 2 && typeof msg == "function") {
    callback = msg;
    msg = userName;
    userName = "randomUser";
  }

  debug("Message Recieved from '" + userName + "'", msg);
  var that = this;
  
  // Ideally these will come from a cache, but that is a exercise for a rainy day
  var system = {
    topicFlags: that._topicFlags,
    sorted: that._sorted, 
    topics: that._topics, 
    thats: that._thats,
    plugins: that._plugins,
    question: that.question, 
    normalize: that.normalize,
    reasoning: that.reasoning,
    facts: that.facts, 
    cnet: that.cnet
  }

  var user = Users.findOrCreate(userName);
  messageFactory(msg, that.question, that.normalize, that.cnet, that.facts, function(messages) {

    async.mapSeries(messages, messageItorHandle(user, system), function(err, messageArray) {
      var reply = "";
      messageArray = Utils.cleanArray(messageArray);
      
      if (messageArray.length == 1) {
        reply = messageArray[0];
      } else {
        // TODO - We will want to add some smarts on putting multiple
        // lines back together - check for tail grammar or drop bits.
        reply = messageArray.join(" ");
      }

      debug("Update and Reply to user '" + user.name + "'", reply);
      return callback(null, reply);
    });
  });

}

SuperScript.prototype.getUser = function(userName) {
  debug("Fetching User", userName);
  return Users.get(userName);
}

module.exports = SuperScript;
