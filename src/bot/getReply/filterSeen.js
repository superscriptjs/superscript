import _ from 'lodash';
import debuglog from 'debug-levels';

import Utils from '../utils';

const debug = debuglog('SS:FilterSeen');

// This may be called several times, once for each topic.
const filterRepliesBySeen = async function filterRepliesBySeen(replyData, options) {
  const filteredResults = replyData.filteredReplies;
  const replyOptions = replyData.replyOptions;
  const system = options.system;
  const pickScheme = replyOptions.order;
  const keepScheme = replyOptions.keep;

  debug.verbose('filterRepliesBySeen', filteredResults);
  const bucket = [];

  await Promise.all(filteredResults.map(async (filteredResult) => {
    const topicName = filteredResult.topic;
    const currentTopic = await system.chatSystem.Topic.findOne({ name: topicName });
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
          debug.verbose('currentTopic.reply_exhaustion', currentTopic.reply_exhaustion);
          debug.verbose('gambit keepScheme', keepScheme);

          if (String(replyId) === String(pastGambit.replyId) &&
          // TODO: For conversation threads this should be disabled because we are looking
          // the wrong way.
          // But for forward threads it should be enabled.
          // String(pastInput.gambitId) === String(inputId) &&
          reply.keep === false &&
          currentTopic.reply_exhaustion !== 'keep') {
            debug.verbose('Already Seen', reply);
            seenReply = true;
          }
        }
      }
    }

    if (!seenReply || system.editMode) {
      bucket.push(filteredResult);
    }
  }));

  debug.verbose('Bucket of selected replies: ', bucket);
  debug.verbose('Pick Scheme:', pickScheme);
  if (!_.isEmpty(bucket)) {
    if (pickScheme === 'ordered') {
      const picked = bucket.shift();
      return picked;
    }
    // Random order
    return Utils.pickItem(bucket);
  } else if (_.isEmpty(bucket) && keepScheme === 'reload') {
    // TODO - reload the replies responsibly, lets call this method again?
    debug.verbose('Lets RELOAD the replies');
    throw new Error('Reload replies');
  } else {
    throw new Error('No replies');
  }
};

export default filterRepliesBySeen;
