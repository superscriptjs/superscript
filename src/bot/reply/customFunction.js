import _ from 'lodash';
import debuglog from 'debug-levels';

const debug = debuglog('SS:Reply:customFunction');

const customFunction = async function customFunction(functionName, functionArgs, replyObj, options) {
  const plugins = options.system.plugins;
  // Important to create a new scope object otherwise we could leak data
  const scope = _.merge({}, options.system.scope);
  scope.extraScope = options.system.extraScope;
  scope.message = options.message;
  scope.user = options.user;

  if (!plugins[functionName]) {
    // If a function is missing, we kill the line and return empty handed
    throw new Error(`WARNING: Custom function (${functionName}) was not found. Your script may not behave as expected.`);
  }

  return new Promise((resolve, reject) => {
    functionArgs.push((err, functionResponse, stopMatching) => {
      let reply = '';
      const props = {};
      if (err) {
        console.error(`Error in plugin function (${functionName}): ${err}`);
        return reject(err);
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

      return resolve(reply);
    });

    debug.verbose(`Calling plugin function: ${functionName}`);
    plugins[functionName].apply(scope, functionArgs);
  });
};

export default customFunction;
