import async from 'async';
import debuglog from 'debug-levels';

import processHelpers from './common';
import Utils from '../utils';
import getReply from '../getReply';

const debug = debuglog('SS:Reply:Respond');

const RESPOND_REGEX = /\^respond\(\s*([\w~]*)\s*\)/;

const respond = function respond(reply, respondMatch, options, callback) {
  let replyObj = {};

  return async.whilst(() => respondMatch,
    (cb) => {
      const newTopic = Utils.trim(respondMatch[1]);
      debug.verbose('Topic Check with new Topic: %s', newTopic);

      processHelpers.getTopic(options.system.chatSystem, newTopic, (err, topicData) => {
        options.pendingTopics = [];
        options.pendingTopics.push(topicData);

        getReply(options.message, options, (err, subreply) => {
          if (err) {
            console.log(err);
          }

          // The topic is not set correctly in getReply!
          debug.verbose('CallBack from respond topic (getReplyObj)', subreply);

          if (subreply && subreply.replyId) {
            debug.verbose('subreply', subreply);
            // We need to do a lookup on subreply.replyId and flash the entire reply.
            options.system.chatSystem.Reply.findById(subreply.replyId)
              .exec((err, fullReply) => {
                if (err) {
                  debug.error(err);
                }

                debug.verbose('fullReply', fullReply);

                debug.verbose('Setting the topic to the matched one');
                options.user.setTopic(newTopic);

                reply = fullReply.reply || '';
                replyObj = subreply;
                replyObj.reply = fullReply;
                replyObj.topicName = newTopic;
                respondMatch = reply.match(RESPOND_REGEX);

                cb((options.depth === 50) ? 'Depth Error' : null);
              });
          } else {
            respondMatch = false;
            reply = '';
            replyObj = {};

            cb((options.depth === 50) ? 'Depth Error' : null);
          }
        });
      });
    },
    (err) => {
      debug.verbose('CallBack from Respond Function', replyObj);
      return callback(err, Utils.trim(reply), options.message.props, replyObj);
    }
  );
};

export default respond;
