import debuglog from 'debug-levels';
import Message from 'ss-message';

import processHelpers from './common';
import getReply from '../getReply';

const debug = debuglog('SS:Reply:topicRedirect');

const topicRedirect = async function topicRedirect(topicName, topicTrigger, options) {
  debug.verbose(`Topic redirection to topic: ${topicName}, trigger: ${topicTrigger}`);

  // Here we are looking for gambits in the NEW topic.
  // TODO: Deprecate this behaviour: a failed topic lookup should fail the whole reply
  let topicData;
  try {
    topicData = await processHelpers.getTopic(options.system.chatSystem, topicName);
  } catch (err) {
    console.error(err);
    return {};
  }

  const messageOptions = {
    factSystem: options.system.factSystem,
  };

  const redirectMessage = await new Promise((resolve, reject) => {
    Message.createMessage(topicTrigger, messageOptions, (err, redirectMessage) => {
      err ? reject(err) : resolve(redirectMessage);
    });
  });

  options.pendingTopics = [topicData];

  const redirectReply = await new Promise((resolve, reject) => {
    getReply(redirectMessage, options, (err, redirectReply) => {
      err ? reject(err) : resolve(redirectReply);
    });
  });

  debug.verbose('redirectReply', redirectReply);
  return redirectReply || {};
};

export default topicRedirect;
