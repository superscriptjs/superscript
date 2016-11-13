import debuglog from 'debug-levels';

import processHelpers from './common';
import getReply from '../getReply';

const debug = debuglog('SS:Reply:Respond');

const respond = function respond(topicName, options, callback) {
  debug.verbose(`Responding to topic: ${topicName}`);

  processHelpers.getTopic(options.system.chatSystem, topicName, (err, topicData) => {
    if (err) {
      console.error(err);
    }

    options.pendingTopics = [topicData];

    getReply(options.message, options, (err, respondReply) => {
      if (err) {
        console.error(err);
      }

      debug.verbose('Callback from respond getReply: ', respondReply);

      if (respondReply) {
        return callback(err, respondReply);
      }
      return callback(err, {});
    });
  });
};

export default respond;
