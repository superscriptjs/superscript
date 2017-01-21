import _ from 'lodash';
import debuglog from 'debug-levels';

import processTags from '../processTags';

const debug = debuglog('SS:GetReply:ProcessTags');

const processReplyTags = async function processReplyTags(reply, options) {
  let replyObj;
  try {
    replyObj = await processTags.processReplyTags(reply, options);
  } catch (err) {
    debug.verbose('There was an error in processTags: ', err);
  }

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
};

export default processReplyTags;
