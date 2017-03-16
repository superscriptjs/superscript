import debuglog from 'debug-levels';

import processHelpers from './common';
import getReply from '../getReply';

const debug = debuglog('SS:Reply:Respond');

const respond = async function respond(topicName, options) {
  debug.verbose(`Responding to topic: ${topicName}`);

  const topicData = await processHelpers.getTopic(options.system.chatSystem, topicName);

  options.pendingTopics = [topicData];

  const respondReply = await new Promise((resolve, reject) => {
    getReply(options.message, options, (err, respondReply) => {
      err ? reject(err) : resolve(respondReply);
    });
  });

  debug.verbose('Callback from respond getReply: ', respondReply);

  return respondReply || {};
};

export default respond;
