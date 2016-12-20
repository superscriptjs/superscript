import _ from 'lodash';
import debuglog from 'debug-levels';
import async from 'async';
import filtersSeen from './filterSeen';

import Utils from '../utils';
import processTags from '../processTags';

const debug = debuglog('SS:GetReply:FilterFunction');

// replyData = {potentialReplies, replyOptions}
const filterRepliesByFunction = function filterRepliesByFunction(replyData, options, callback) {
  const potentialReplies = replyData.potentialReplies;
  const replyOptions = replyData.replyOptions;

  const filterHandle = function filterHandle(potentialReply, cb) {
    const system = options.system;

    // We support a single filter function in the reply
    // It returns true/false to aid in the selection.

    if (potentialReply.reply.filter) {
      const stars = { stars: potentialReply.stars };
      processTags.preprocess(potentialReply.reply.filter, stars, options, (err, cleanFilter) => {
        debug.verbose(`Reply filter function found: ${cleanFilter}`);

        const filterScope = _.merge({}, system.scope);
        filterScope.user = options.user;
        filterScope.message = options.message;
        filterScope.message_props = options.system.extraScope;

        Utils.runPluginFunc(cleanFilter, filterScope, system.plugins, (err, filterReply) => {
          if (err) {
            console.error(err);
            return cb(null, true);
          }

          if (filterReply === 'true' || filterReply === true) {
            return cb(null, true);
          }
          return cb(null, false);
        });
      });
    } else {
      cb(null, true);
    }
  };

  async.filterSeries(potentialReplies, filterHandle, (err, filteredReplies) => {
    debug.verbose('filterByFunction results: ', filteredReplies);

    filtersSeen.filterSeenReplies({ filteredReplies, replyOptions }, options, (err, reply) => {


      
      // At this point we just have one reply
      if (err) {
        debug.error(err);
        // Keep looking for results
        // Invoking callback with no arguments ensure mapSeries carries on looking at matches from other gambits
        callback();
      } else {
        processTags.processReplyTags(reply, options, (err, replyObj) => {
          if (!_.isEmpty(replyObj)) {
            // reply is the selected reply object that we created earlier (wrapped mongoDB reply)
            // reply.reply is the actual mongoDB reply object
            // reply.reply.reply is the reply string
            replyObj.matched_reply_string = reply.reply.reply;
            replyObj.matched_topic_string = reply.topic;

            debug.verbose('Reply object after processing tags: ', replyObj);

            if (replyObj.continueMatching === false) {
              debug.info('Continue matching is set to false: returning.');
              callback(true, replyObj);
            } else if (replyObj.continueMatching === true || replyObj.reply.reply === '') {
              debug.info('Continue matching is set to true or reply is not empty: continuing.');
              // By calling back with error set as 'true', we break out of async flow
              // and return the reply to the user.
              callback(null, replyObj);
            } else {
              debug.info('Reply is not empty: returning.');
              callback(true, replyObj);
            }
          } else {
            debug.verbose('No reply object was received from processTags so check for more.');
            if (err) {
              debug.verbose('There was an error in processTags', err);
            }
            callback(null, null);
          }
        });
      }
    });
  });
};

export default {
  filterRepliesByFunction
};