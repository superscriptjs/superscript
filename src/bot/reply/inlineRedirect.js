import debuglog from 'debug-levels';
import Message from 'ss-message';

import processHelpers from './common';
import getReply from '../getReply';

const debug = debuglog('SS:Reply:inline');

const inlineRedirect = async function inlineRedirect(triggerTarget, options) {
  debug.verbose(`Inline redirection to: '${triggerTarget}'`);

  // if we have a special topic, reset it to the previous one
  // in order to preserve the context for inline redirection
  if (options.topic === '__pre__' || options.topic === '__post__') {
    if (options.user.history.length !== 0) {
      options.topic = options.user.history[0].topic;
    }
  }

  let topicData;
  try {
    topicData = await processHelpers.getTopic(options.system.chatSystem, options.topic);
  } catch (err) {
    console.error(err);
    return {};
  }

  const messageOptions = {
    factSystem: options.system.factSystem,
  };

  const redirectMessage = await new Promise((resolve, reject) => {
    Message.createMessage(triggerTarget, messageOptions, (err, redirectMessage) => {
      err ? reject(err) : resolve(redirectMessage);
    });
  });

  options.pendingTopics = [topicData];

  const redirectReply = await new Promise((resolve, reject) => {
    getReply(redirectMessage, options, (err, redirectReply) => {
      err ? reject(err) : resolve(redirectReply);
    });
  });

  debug.verbose('Response from inlineRedirect: ', redirectReply);
  return redirectReply || {};
};

export default inlineRedirect;
