import _ from 'lodash';
import async from 'async';
import debuglog from 'debug-levels';

import Utils from '../utils';

const debug = debuglog('SS:Reply:customFunction');

const customFunction = function customFunction(reply, match, options, callback) {
  const plugins = options.system.plugins;
  // Important to create a new scope object otherwise we could leak data
  const scope = _.merge({}, options.system.scope);
  scope.message_props = options.system.extraScope;
  scope.message = options.message;
  scope.user = options.user;

  let mbit = null;

  // We use async to capture multiple matches in the same reply
  return async.whilst(() => match,
    (cb) => {
      // Call Function here
      const main = match[0];
      const pluginName = Utils.trim(match[1]);
      const partsStr = Utils.trim(match[2]);
      const parts = partsStr.split(',');

      debug.verbose('-- Function Arguments --', parts);
      const args = [];
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== '') {
          args.push(Utils.decodeCommas(parts[i].trim()));
        }
      }

      if (plugins[pluginName]) {
        // SubReply is the results of the object coming back
        // TODO. Subreply should be optional and could be undefined, or null
        args.push((err, subreply, matchBit) => {
          let replyStr;

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

        debug.verbose('Calling Plugin Function', pluginName);
        plugins[pluginName].apply(scope, args);
      } else if (pluginName === 'topicRedirect' || pluginName === 'respond') {
        debug.verbose('Existing, we have a systemFunction', pluginName);
        match = false;
        cb(null, '');
      } else {
        // If a function is missing, we kill the line and return empty handed
        console.log(`WARNING:\nCustom Function (${pluginName}) was not found. Your script may not behave as expected`);
        debug.verbose('Custom Function not-found', pluginName);
        match = false;
        cb(true, '');
      }
    },
    (err) => {
      debug.verbose('Callback from custom function', err);
      return callback(err, reply, scope.message.props, {}, mbit);
    }
  );
};

export default customFunction;
