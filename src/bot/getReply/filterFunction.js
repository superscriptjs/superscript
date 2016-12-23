import _ from 'lodash';
import debuglog from 'debug-levels';

import processTags from '../processTags';
import Utils from '../utils';

const debug = debuglog('SS:FilterFunction');

// replyData = {potentialReplies, replyOptions}
const filterRepliesByFunction = async function filterRepliesByFunction(replyData, options) {
  let potentialReplies = replyData.potentialReplies;

  const bits = await Promise.all(potentialReplies.map(async (potentialReply) => {
    const system = options.system;

    // We support a single filter function in the reply
    // It returns true/false to aid in the selection.

    if (potentialReply.reply.filter) {
      const stars = { stars: potentialReply.stars };
      return await new Promise((resolve, reject) => {
        processTags.preprocess(potentialReply.reply.filter, stars, options, (err, cleanFilter) => {
          debug.verbose(`Reply filter function found: ${cleanFilter}`);

          const filterScope = _.merge({}, system.scope);
          filterScope.user = options.user;
          filterScope.message = options.message;
          filterScope.message_props = options.system.extraScope;

          Utils.runPluginFunc(cleanFilter, filterScope, system.plugins, (err, filterReply) => {
            if (err) {
              console.error(err);
              return resolve(false);
            }

            if (filterReply === 'true' || filterReply === true) {
              return resolve(true);
            }
            return resolve(false);
          });
        });
      });
    }

    return true;
  }));

  potentialReplies = potentialReplies.filter(() => bits.shift());

  return potentialReplies;
};

export default filterRepliesByFunction;
