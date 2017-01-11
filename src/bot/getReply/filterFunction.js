import _ from 'lodash';
import debuglog from 'debug-levels';

import processTags from '../processTags';
import Utils from '../utils';

const debug = debuglog('SS:FilterFunction');

const filterRepliesByFunction = async function filterRepliesByFunction(potentialReplies, options) {
  const bits = await Promise.all(potentialReplies.map(async (potentialReply) => {
    const system = options.system;

    // We support a single filter function in the reply
    // It returns true/false to aid in the selection.

    if (potentialReply.reply.filter) {
      const stars = { stars: potentialReply.stars };
      const cleanFilter = await new Promise((resolve) => {
        processTags.preprocess(potentialReply.reply.filter, stars, options, (err, cleanFilter) => {
          resolve(cleanFilter);
        });
      });

      debug.verbose(`Reply filter function found: ${cleanFilter}`);

      const filterScope = _.merge({}, system.scope);
      filterScope.user = options.user;
      filterScope.message = options.message;
      filterScope.message_props = options.system.extraScope;

      try {
        const [filterReply] = await Utils.runPluginFunc(cleanFilter, filterScope, system.plugins);
        if (filterReply === 'true' || filterReply === true) {
          return true;
        }
        return false;
      } catch (err) {
        console.error(err);
        return false;
      }
    }

    return true;
  }));

  potentialReplies = potentialReplies.filter(() => bits.shift());

  return potentialReplies;
};

export default filterRepliesByFunction;
