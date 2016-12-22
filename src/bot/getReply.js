import _ from 'lodash';
import debuglog from 'debug-levels';
import async from 'async';

import Utils from './utils';
import processTags from './processTags';
import filter from './replies/filter';
import topic from './replies/topic';

const debug = debuglog('SS:GetReply');

const afterHandle = function afterHandle(user, callback) {
  // Note, the first arg is the ReplyBit (normally the error);
  // We are breaking the matchItorHandle flow on data stream.
  return (continueSearching, matchSet) => {
    debug.verbose(`Continue searching: ${continueSearching}`);
    debug.verbose(`Set of matches: ${matchSet}`);

    // remove empties
    matchSet = _.compact(matchSet);

    const minMatchSet = [];
    let props = {};
    let clearConversation = false;
    let lastTopicToMatch = null;
    let lastStarSet = null;
    let lastReplyId = null;
    let replyString = '';
    let lastSubReplies = null;
    let lastContinueMatching = null;
    let lastReplyIds = null;

    for (let i = 0; i < matchSet.length; i++) {
      const item = matchSet[i];
      const mmm = {
        topic: item.matched_topic_string || item.topic,
        input: item.trigger,
        reply: item.matched_reply_string,
      };

      if (!_.isEmpty(item.minMatchSet)) {
        mmm.subset = item.minMatchSet;
      } else {
        mmm.output = item.reply.reply;
      }

      minMatchSet.push(mmm);

      if (item && item.reply && item.reply.reply) {
        if (replyString === '') {
          replyString += `${item.reply.reply}`;
        } else {
          replyString += ` ${item.reply.reply}`;
        }
      }

      props = _.assign(props, item.props);
      lastTopicToMatch = item.topic;
      lastStarSet = item.stars;
      lastReplyId = item.reply._id;
      lastSubReplies = item.subReplies;
      lastContinueMatching = item.continueMatching;
      lastReplyIds = item.replyIds;

      if (item.clearConversation) {
        clearConversation = item.clearConversation;
      }
    }

    let threadsArr = [];
    if (_.isEmpty(lastSubReplies)) {
      threadsArr = processTags.processThreadTags(replyString);
    } else {
      threadsArr[0] = replyString;
      threadsArr[1] = lastSubReplies;
    }

    const cbdata = {
      replyId: lastReplyId,
      replyIds: lastReplyIds,
      props,
      clearConversation,
      topicName: lastTopicToMatch,
      minMatchSet,
      string: threadsArr[0],
      subReplies: threadsArr[1],
      stars: lastStarSet,
      continueMatching: lastContinueMatching,
    };

    debug.verbose('afterHandle', cbdata);

    callback(null, cbdata);
  };
};

// Iterates through matched gambits
const matchItorHandle = function matchItorHandle(message, options) {
  const system = options.system;
  options.message = message;

  return (match, callback) => {
    debug.verbose('Match itor: ', match.gambit);

    // In some edge cases, replies were not being populated...
    // Let's do it here
    system.chatSystem.Gambit.findById(match.gambit._id)
      .populate('replies')
      .exec((err, gambitExpanded) => {
        if (err) {
          console.log(err);
        }

        match.gambit = gambitExpanded;
        match.gambit.getRootTopic((err, topic) => {
          if (err) {
            console.log(err);
          }

          let stars = match.stars;
          if (!_.isEmpty(message.stars)) {
            stars = message.stars;
          }

          const potentialReplies = [];

          for (let i = 0; i < match.gambit.replies.length; i++) {
            const reply = match.gambit.replies[i];
            const replyData = {
              id: reply.id,
              stars,
              reply,
              topic: topic.name,

              // For the logs
              trigger: match.gambit.input,
              trigger_id: match.gambit.id,
              trigger_id2: match.gambit._id,
            };
            potentialReplies.push(replyData);
          }

          const replyOptions = {
            gambitKeep: match.gambit.reply_exhaustion,
            topicKeep: topic.reply_exhaustion,
            order: match.gambit.reply_order,
          };

          // Find a reply for the match.
          filter.filterRepliesByFunction({ potentialReplies, replyOptions }, options, (err, replies) => {
            const pickScheme = replyOptions.order;
            const keepScheme = options.system.defaultKeepScheme;

            debug.verbose('Bucket of selected replies: ', replies);
            debug.verbose('Pick Scheme:', pickScheme);

            if (!_.isEmpty(replies)) {
              const picked = (pickScheme === 'ordered')
                ? replies.shift()
                : Utils.pickItem(replies);
              funtProcessTags(Utils.pickItem(replies), options, callback);
            } else if (_.isEmpty(replies) && keepScheme === 'reload') {
              callback();
            } else {
              // Keep looking for results
              // Invoking callback with no arguments ensure mapSeries carries on looking at matches from other gambits
              callback();
            }
          });
        });
      },
    );
  };
};


const funtProcessTags = function funtProcessTags(reply, options, callback) {
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

/**
 * The real craziness to retreive a reply.
 * @param {Object} messageObject - The instance of the Message class for the user input.
 * @param {Object} options.system - The system.
 * @param {Object} options.user - The user.
 * @param {Number} options.depth - The depth of how many times this function has been recursively called.
 * @param {Array} options.pendingTopics - A list of topics that have been specified to specifically search (usually via topicRedirect etc).
 * @param {Function} callback - Callback function once the reply has been found.
 */
const getReply = function getReply(messageObject, options, callback) {
  // This method can be called recursively.
  if (options.depth) {
    debug.verbose('Called Recursively', options.depth);
    if (options.depth >= 20) {
      console.error('getReply was called recursively 20 times - returning null reply.');
      return callback(null, null);
    }
  }

  topic.findTopicsToProcess(messageObject, options, function(err, pendingTopics) {
    if (err) {
      console.error(err);
    }
    topic.afterFindPendingTopics(pendingTopics, messageObject, options, (err, matches) => {
      async.mapSeries(matches, matchItorHandle(messageObject, options), afterHandle(options.user, callback));
    });
  });
};

export default getReply;
