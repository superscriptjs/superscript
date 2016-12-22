import _ from 'lodash';
import debuglog from 'debug-levels';
import async from 'async';

import processTags from '../processTags';
import Utils from '../utils';

const debug = debuglog('SS:GetReply:Filters');

// replyData = {potentialReplies, replyOptions}
const byFunction = function byFunction(replyData, options, callback) {
  const potentialReplies = replyData.potentialReplies;
  const replyOptions = replyData.replyOptions;
  debug.verbose('replyData', replyData);
  debug.verbose('filterRepliesByFunction', potentialReplies);

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

  async.filterSeries(potentialReplies, filterHandle, function(err, filteredReplies) {
    debug.verbose(`filterByFunction results: ${filteredReplies}`);
    callback(null, { filteredReplies, replyOptions }, options);
  });
};

// This may be called several times, once for each topic.
// filteredResults
const bySeen = function bySeen(replyData, options, callback) {
  const filteredResults = replyData.filteredReplies;
  const replyOptions = replyData.replyOptions;
  const system = options.system;
  const gambitKeepScheme = replyOptions.gambitKeep;
  const topicKeepScheme = replyOptions.topicKeep;
  let keepScheme = options.system.defaultKeepScheme;
  debug.verbose('filterRepliesBySeen', filteredResults);
  const bucket = [];

  const eachSeenResultItor = function eachSeenResultItor(filteredResult, next) {
    
    keepScheme = (options.system.defaultKeepScheme !== topicKeepScheme)
      ? topicKeepScheme 
      : options.system.defaultKeepScheme;

    // var repIndex = filteredResult.id;
    const replyId = filteredResult.reply._id;
    const reply = filteredResult.reply;
    const gambitId = filteredResult.trigger_id2;
    let seenReply = false;

    // Filter out SPOKEN replies.
    // If something is said on a different trigger we don't remove it.
    // If the trigger is very open ie "*", you should consider putting a {keep} flag on it.

    for (let i = 0; i <= 10; i++) {
      const topicItem = options.user.history.topic[i];

      if (topicItem !== undefined) {
        // TODO: Come back to this and check names make sense
        const pastGambit = options.user.history.reply[i];
        const pastInput = options.user.history.input[i];

        // Sometimes the history has null messages because we spoke first.
        if (pastGambit && pastInput) {
          // Do they match and not have a keep flag

          debug.verbose('--------------- FILTER SEEN ----------------');
          debug.verbose('Past replyId', pastGambit.replyId);
          debug.verbose('Current replyId', replyId);
          debug.verbose('Past gambitId', String(pastInput.gambitId));
          debug.verbose('Current gambitId', String(gambitId));
          debug.verbose('reply.keep', reply.keep);
          debug.verbose('topic keepScheme', topicKeepScheme);
          debug.verbose('gambit keepScheme', gambitKeepScheme);

          if (String(replyId) === String(pastGambit.replyId) &&
          // TODO: For conversation threads this should be disabled because we are looking
          // the wrong way.
          // But for forward threads it should be enabled.
          // String(pastInput.gambitId) === String(inputId) &&
          reply.keep === false &&
          gambitKeepScheme !== "keep" &&
          topicKeepScheme !== "keep"
          ) {
            debug.verbose('Already Seen', reply);
            seenReply = true;
          }
        }
      }
    }

    if (!seenReply || system.editMode) {
      bucket.push(filteredResult);
    }

    next();
  };

  async.eachSeries(filteredResults, eachSeenResultItor, (err) => {
    callback(null, {filteredReplies: bucket, replyOptions }, options);
  });
};


export default {
  byFunction, 
  bySeen
};