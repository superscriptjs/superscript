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
    options.user.history.map((historyItem) => {
      if (historyItem.topic !== undefined) {
        const pastGambit = historyItem.reply;
        const pastInput = historyItem.input;

        if (pastGambit && pastInput) {
          if (pastGambit.replyIds && pastGambit.replyIds.find(id => String(id) === String(replyId))) {
            debug.verbose('Already Seen', filteredResult.reply);
            filteredResult.seenCount += 1;
          }
        }
      }
    });
    return filteredResult;
  });
  return bucket;
};

export default filterRepliesBySeen;
