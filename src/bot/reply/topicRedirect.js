import debuglog from 'debug-levels';

import processHelpers from './common';
import Message from '../message';
import getReply from '../getReply';

const debug = debuglog('SS:Reply:topicRedirect');

const topicRedirect = function topicRedirect(topicName, topicTrigger, options, callback) {
  debug.verbose(`Topic redirection to topic: ${topicName}, trigger: ${topicTrigger}`);

  // Here we are looking for gambits in the NEW topic.
  processHelpers.getTopic(options.system.chatSystem, topicName, (err, topicData) => {
    if (err) {
      console.error(err);
      return callback(null, {});
    }

    const messageOptions = {
      factSystem: options.system.factSystem
    };

    Message.createMessage(topicTrigger, messageOptions, (redirectMessage) => {
      options.pendingTopics = [topicData];

      getReply(redirectMessage, options, (err, redirectReply) => {
        if (err) {
          console.error(err);
        }

        debug.verbose('redirectReply', redirectReply);
        if (redirectReply) {
          return callback(null, redirectReply);
        }
        return callback(null, {});
      });
    });
  });
};

export default topicRedirect;
