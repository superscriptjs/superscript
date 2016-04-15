var Utils = require("../utils");
var async = require("async");
var debug = require("debug-levels")("SS:Reply:customFunction");
var _ = require("lodash");

module.exports = function (reply, match, options, callback) {
  
  var plugins = options.system.plugins;
  var scope = options.system.scope;
  var localOptions = options.localOptions;

  scope.message_props = localOptions.messageScope;
  scope.message = localOptions.message;
  scope.user = localOptions.user;

  var mbit = null;

  // We use async to capture multiple matches in the same reply
  return async.whilst(
    function () {
      return match;
    },
    function (cb) {
      // Call Function here

      var main = match[0];
      var pluginName = Utils.trim(match[1]);
      var partsStr = Utils.trim(match[2]);
      var parts = partsStr.split(",");

      var args = [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i] !== "") {
          args.push(Utils.decodeCommas(parts[i].trim()));
        }
      }

      if (plugins[pluginName]) {

        // SubReply is the results of the object coming back
        // TODO. Subreply should be optional and could be undefined, or null
        args.push(function customFunctionHandle(err, subreply, matchBit) {

          var replyStr;

          if (_.isPlainObject(subreply)) {
            if (subreply.hasOwnProperty('text')) {
              replyStr = subreply.text;
              delete subreply.text;
            }

            if (subreply.hasOwnProperty('reply')) {
              replyStr = subreply.reply;
              delete subreply.reply;
            }
            scope.message.props = _.assign(scope.message.props, subreply);

          } else {
            replyStr = subreply;
          }

          match = false;
          reply = reply.replace(main, replyStr);
          match = reply.match(/\^(\w+)\(([~\w<>,\s]*)\)/);
          mbit = matchBit;
          if (err) {
            cb(err);
          } else {
            cb();
          }
        });

        debug.verbose("Calling Plugin Function", pluginName);
        plugins[pluginName].apply(scope, args);

      } else if (pluginName === "topicRedirect" || pluginName === "respond") {
        debug.verbose("Existing, we have a systemFunction", pluginName);
        match = false;
        cb(null, "");
      } else {
        // If a function is missing, we kill the line and return empty handed
        console.log("WARNING:\nCustom Function (" + pluginName + ") was not found. Your script may not behave as expected");
        debug.verbose("Custom Function not-found", pluginName);
        match = false;
        cb(true, "");
      }
    },
    function (err) {
      debug.verbose("Callback from custom function", err);
      return callback(err, reply, scope.message.props, {}, mbit);
    }
  );
};
