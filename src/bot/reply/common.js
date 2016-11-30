import debuglog from 'debug-levels';

const debug = debuglog('SS:ProcessHelpers');

const getTopic = function getTopic(chatSystem, name, cb) {
  if (name) {
    chatSystem.Topic.findOne({ name }, (err, topicData) => {
      if (!topicData) {
        cb(new Error(`No topic found for the topic name "${name}"`));
      } else {
        debug.verbose('Getting topic data for', topicData);
        cb(err, { id: topicData._id, name, type: 'TOPIC' });
      }
    });
  } else {
    cb(null, null);
  }
};

export default {
  getTopic,
};
