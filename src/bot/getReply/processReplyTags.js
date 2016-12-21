import _ from 'lodash';
import debuglog from 'debug-levels';

import processTags from '../processTags';

const debug = debuglog('SS:GetReply:ProcessTags');

const processReplyTags = async function processReplyTags(reply, options) {
  const replyObj = await new Promise((resolve, reject) => {
    processTags.processReplyTags(reply, options, (err, replyObj) => {
      if (err) {
        debug.verbose('There was an error in processTags', err);
        return reject(err);
      }
      return resolve(replyObj);
    });
  });

  if (!_.isEmpty(replyObj)) {
    // reply is the selected reply object that we created earlier (wrapped mongoDB reply)
    // reply.reply is the actual mongoDB reply object
    // reply.reply.reply is the reply string
    replyObj.matched_reply_string = reply.reply.reply;
    replyObj.matched_topic_string = reply.topic;

    debug.verbose('Reply object after processing tags: ', replyObj);

    return replyObj;
  }

  debug.verbose('No reply object was received from processTags so check for more.');
  return null;
  // callback(null, null);
};

export default processReplyTags;
