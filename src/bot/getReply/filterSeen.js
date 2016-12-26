import debuglog from 'debug-levels';

const debug = debuglog('SS:FilterSeen');

// This may be called several times, once for each topic.
const filterRepliesBySeen = async function filterRepliesBySeen(filteredResults, options) {
  debug.verbose('filterRepliesBySeen', filteredResults);

  const bucket = filteredResults.map((filteredResult) => {
    const replyId = filteredResult.reply._id;
    if (!filteredResult.seenCount) {
      filteredResult.seenCount = 0;
    }
    for (let i = 0; i <= 10; i++) {
      if (options.user.history.topic[i] !== undefined) {
        const pastGambit = options.user.history.reply[i];
        const pastInput = options.user.history.input[i];

        if (pastGambit && pastInput) {
          if (String(replyId) === String(pastGambit.replyId)) {
            debug.verbose('Already Seen', filteredResult.reply);
            filteredResult.seenCount += 1;
          }
        }
      }
    }
    return filteredResult;
  });
  return bucket;
};

export default filterRepliesBySeen;
