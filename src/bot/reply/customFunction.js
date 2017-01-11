import _ from 'lodash';
import debuglog from 'debug-levels';

const debug = debuglog('SS:Reply:customFunction');

const customFunction = function customFunction(functionName, functionArgs, replyObj, options, callback) {
  const plugins = options.system.plugins;
  // Important to create a new scope object otherwise we could leak data
  const scope = _.merge({}, options.system.scope);
  scope.extraScope = options.system.extraScope;
  scope.message = options.message;
  scope.user = options.user;

  if (plugins[functionName]) {
    functionArgs.push((err, functionResponse, stopMatching) => {
      let reply = '';
      const props = {};
      if (err) {
        console.error(`Error in plugin function (${functionName}): ${err}`);
        return callback(err);
      }

      if (_.isPlainObject(functionResponse)) {
        if (functionResponse.text) {
          reply = functionResponse.text;
          delete functionResponse.text;
        }

        if (functionResponse.reply) {
          reply = functionResponse.reply;
          delete functionResponse.reply;
        }

        // There may be data, so merge it with the reply object
        replyObj.props = _.merge(replyObj.props, functionResponse);
        if (stopMatching !== undefined) {
          replyObj.continueMatching = !stopMatching;
        }
      } else {
        reply = functionResponse || '';
        if (stopMatching !== undefined) {
          replyObj.continueMatching = !stopMatching;
        }
      }

      return callback(err, reply);
    });

    debug.verbose(`Calling plugin function: ${functionName}`);
    plugins[functionName].apply(scope, functionArgs);
  } else {
    // If a function is missing, we kill the line and return empty handed
    console.error(`WARNING: Custom function (${functionName}) was not found. Your script may not behave as expected.`);
    callback(true, '');
  }
};

export default customFunction;
