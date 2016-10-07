import async from 'async';
import debuglog from 'debug-levels';

import processHelpers from './common';
import Message from '../message';
import Utils from '../utils';
import getReply from '../getReply';

const debug = debuglog('SS:Reply:topicRedirect');

const TOPIC_REGEX = /\^topicRedirect\(\s*([~\w<>\s]*),([~\w<>\s]*)\s*\)/;

const topicRedirect = function topicRedirect(reply, stars, redirectMatch, options, callback) {
  let replyObj = {};

  // Undefined, unless it is being passed back
  let mbit;

  return async.whilst(() => redirectMatch,
    (cb) => {
      const main = Utils.trim(redirectMatch[0]);
      const topic = Utils.trim(redirectMatch[1]);
      const target = Utils.trim(redirectMatch[2]);

      debug.verbose('Topic Redirection to: %s topic: %s', target, topic);
      options.user.setTopic(topic);

      // Here we are looking for gambits in the NEW topic.
      processHelpers.getTopic(options.system.chatSystem, topic, (err, topicData) => {
        if (err) {
          /*
            In this case the topic does not exist, we want to just pretend it wasn't
            provided and reply with whatever else is there.
           */
          redirectMatch = reply.match(TOPIC_REGEX);
          reply = Utils.trim(reply.replace(main, ''));
          debug.verbose('Invalid Topic', reply);
          return cb(null);
        }

        const messageOptions = {
          facts: options.system.factSystem,
        };

        Message.createMessage(target, messageOptions, (replyMessageObject) => {
          options.pendingTopics = [];
          options.pendingTopics.push(topicData);

          // Pass the stars (captured wildcards) forward
          replyMessageObject.stars = stars.slice(1);

          getReply(replyMessageObject, options, (err, subreply) => {
            if (err) {
              cb(null);
            }

            if (subreply) {
              // We need to do a lookup on subreply.replyId and flash the entire reply.
              debug.verbose('CallBack from topicRedirect', subreply);
              options.system.chatSystem.Reply.findById(subreply.replyId)
                .exec((err, fullReply) => {
                  if (err) {
                    console.log('No SubReply ID found', err);
                  }

                // This was changed as a result of gh-236
                // reply = reply.replace(main, fullReply.reply);
                  reply = reply.replace(main, subreply.string);
                  replyObj = subreply;

                  debug.verbose('SubReply', subreply);
                  debug.verbose('fullReply', fullReply);

                  if ((fullReply === null && !replyObj.reply) || err) {
                    debug.verbose('Something bad happened upstream');
                    cb('upstream error');
                  } else {
                  // Override the subreply string with the new complex one
                    replyObj.string = reply;

                    replyObj.reply = fullReply;
                    replyObj.reply.reply = reply;

                  // Lets capture this data too for better logs
                    replyObj.minMatchSet = subreply.minMatchSet;

                  // This may be set before the redirect.
                    mbit = replyObj.breakBit;

                    redirectMatch = reply.match(TOPIC_REGEX);
                    cb((options.depth === 50) ? 'Depth Error' : null);
                  }
                });
            } else {
              redirectMatch = false;
              reply = reply.replace(main, '');
              replyObj = {};
              cb((options.depth === 50) ? 'Depth Error' : null);
            }
          }); // getReply
        }); // Message
      });
    },
    (err) => {
      debug.verbose('CallBack from topic redirect', reply, replyObj);
      return callback(err, Utils.trim(reply), options.message.props, replyObj, mbit);
    }
  );
};

export default topicRedirect;
