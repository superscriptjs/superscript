import debuglog from 'debug-levels';

const debug = debuglog('SS:Helpers');

const _walkReplyParent = async function _walkReplyParent(replyId, replyIds, chatSystem) {
  try {
    const reply = await chatSystem.Reply.findById(replyId).populate('parent');
    debug.verbose('Walk', reply);

    if (reply) {
      replyIds.push(reply._id);
      if (reply.parent && reply.parent.parent) {
        return await _walkReplyParent(reply.parent.parent, replyIds, chatSystem);
      }
    }
  } catch (err) {
    console.error(err);
  }
  return replyIds;
};

const walkReplyParent = async function walkReplyParent(replyId, chatSystem) {
  return await _walkReplyParent(replyId, [], chatSystem);
};

export default {
  walkReplyParent,
};
