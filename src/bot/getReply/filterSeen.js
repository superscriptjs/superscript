import debuglog from 'debug-levels';

const debug = debuglog('SS:FilterSeen');

// This may be called several times, once for each topic.
const filterRepliesBySeen = async function filterRepliesBySeen(replyData, options) {
  const filteredResults = replyData.filteredReplies;
  const replyOptions = replyData.replyOptions;
  const system = options.system;
  const gambitKeepScheme = replyOptions.gambitKeep;
  const topicKeepScheme = replyOptions.topicKeep;

  debug.verbose('filterRepliesBySeen', filteredResults);
  const bucket = [];

  filteredResults.forEach((filteredResult) => {
    // const repIndex = filteredResult.id;
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
            gambitKeepScheme !== 'keep' &&
            topicKeepScheme !== 'keep'
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
  });

  return bucket;
};

export default filterRepliesBySeen;
