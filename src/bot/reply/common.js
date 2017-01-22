import debuglog from 'debug-levels';

const debug = debuglog('SS:ProcessHelpers');

const getTopic = async function getTopic(chatSystem, name) {
  if (!name) {
    // TODO: This should probably throw, not return null
    return null;
  }

  debug.verbose('Getting topic data for', name);
  const topicData = await chatSystem.Topic.findOne({ name }).lean().exec();

  if (!topicData) {
    throw new Error(`No topic found for the topic name "${name}"`);
  } else {
    return { id: topicData._id, name, type: 'TOPIC' };
  }
};

export default {
  getTopic,
};
