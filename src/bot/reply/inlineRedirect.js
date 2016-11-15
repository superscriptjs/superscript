import debuglog from 'debug-levels';

import Message from '../message';
import processHelpers from './common';
import getReply from '../getReply';

const debug = debuglog('SS:Reply:inline');

const inlineRedirect = function inlineRedirect(triggerTarget, options, callback) {
  debug.verbose(`Inline redirection to: '${triggerTarget}'`);

  // if we have a special topic, reset it to the previous one
  // in order to preserve the context for inline redirection
  if (options.topic === '__pre__' || options.topic === '__post__') {
    if (options.user.history.topic.length) {
      options.topic = options.user.history.topic[0];
    }
  }

  processHelpers.getTopic(options.system.chatSystem, options.topic, (err, topicData) => {
    const messageOptions = {
      factSystem: options.system.factSystem,
    };

    Message.createMessage(triggerTarget, messageOptions, (redirectMessage) => {
      options.pendingTopics = [topicData];

      getReply(redirectMessage, options, (err, redirectReply) => {
        if (err) {
          console.error(err);
        }

        debug.verbose('Response from inlineRedirect: ', redirectReply);
        if (redirectReply) {
          return callback(null, redirectReply);
        }
        return callback(null, {});
      });
    });
  });
};

export default inlineRedirect;
