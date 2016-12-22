import _ from 'lodash';
import debuglog from 'debug-levels';
import async from 'async';
import Utils from '../utils';

const debug = debuglog('SS:GetReply:Topic');

const findTopicsToProcess = function findTopicsToProcess(messageObject, options, callback) {
  // We already have a pre-set list of potential topics from directReply, respond or topicRedirect
  if (!_.isEmpty(_.reject(options.pendingTopics, _.isNull))) {
    debug.verbose('Using pre-set topic list via directReply, respond or topicRedirect');
    debug.info('Topics to check: ', options.pendingTopics.map(topic => topic.name));
    callback(null, options.pendingTopics);
  } else {
    const chatSystem = options.system.chatSystem;

    // Find potential topics for the response based on the message (tfidfs)
    chatSystem.Topic.findPendingTopicsForUser(options.user, messageObject, (err, pendingTopics) => {
      if (err) {
        console.error(err);
      }
      callback(err, pendingTopics);
    });
  }
}

const afterFindPendingTopics = function afterFindPendingTopics(pendingTopics, messageObject, options, callback) {
  debug.verbose(`Found pending topics/conversations: ${JSON.stringify(pendingTopics, null, 2)}`);

  // We use map here because it will bail on error.
  // The error is our escape hatch when we have a reply WITH data.
  async.mapSeries(
    pendingTopics,
    topicItorHandle(messageObject, options),
    (err, results) => {
      if (err) {
        console.error(err);
      }

      // Remove the empty topics, and flatten the array down.
      const matches = _.flatten(_.filter(results, n => n));

      debug.info('Matching gambits are: ');
      matches.forEach((match) => {
        debug.info(`Trigger: ${match.gambit.input}`);
        debug.info(`Replies: ${match.gambit.replies.map(reply => reply.reply).join('\n')}`);
      });

      callback(err, matches);
    },
  );
};


// Topic iterator, we call this on each topic or conversation reply looking for a match.
// All the matches are stored and returned in the callback.
const topicItorHandle = function topicItorHandle(messageObject, options) {
  const system = options.system;

  return (topicData, callback) => {
    if (topicData.type === 'TOPIC') {
      system.chatSystem.Topic.findById(topicData.id)
        .populate('gambits')
        .exec((err, topic) => {
          if (err) {
            console.error(err);
          }
          if (topic) {
            // We do realtime post processing on the input against the user object
            if (topic.filter) {
              debug.verbose(`Topic filter function found: ${topic.filter}`);

              const filterScope = _.merge({}, system.scope);
              filterScope.user = options.user;
              filterScope.message = messageObject;
              filterScope.topic = topic;
              filterScope.message_props = options.system.extraScope;

              Utils.runPluginFunc(topic.filter, filterScope, system.plugins, (err, filterReply) => {
                if (err) {
                  console.error(err);
                  return topic.findMatch(messageObject, options, callback);
                }
                if (filterReply === 'true' || filterReply === true) {
                  return callback(null, false);
                }
                return topic.findMatch(messageObject, options, callback);
              });
            } else {
              // We look for a match in the topic.
              topic.findMatch(messageObject, options, callback);
            }
          } else {
            // We call back if there is no topic Object
            // Non-existant topics return false
            callback(null, false);
          }
        },
      );
    } else if (topicData.type === 'REPLY') {
      system.chatSystem.Reply.findById(topicData.id)
        .populate('gambits')
        .exec((err, reply) => {
          if (err) {
            console.error(err);
          }
          debug.verbose('Conversation reply thread: ', reply);
          if (reply) {
            reply.findMatch(messageObject, options, callback);
          } else {
            callback(null, false);
          }
        },
      );
    } else {
      debug.verbose("We shouldn't hit this! 'topicData.type' should be 'TOPIC' or 'REPLY'");
      callback(null, false);
    }
  };
};

export default {
  findTopicsToProcess,
  afterFindPendingTopics
};