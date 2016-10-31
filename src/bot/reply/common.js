import debuglog from 'debug-levels';

import Utils from '../utils';
import wordnet from './wordnet';

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

// TODO - Topic Setter should have its own property
/**
 * This function checks if the reply has "{topic=newTopic}" in the response,
 * and returns an array of the reply and the topic name found.
 *
 * For example, the reply:
 *
 * - Me too! {topic=animals}
 *
 * Would return ['Me too!', 'animals'].
 *
 * @param {String} reply - The reply string you want to check for a topic setter.
 */
const topicSetter = function topicSetter(replyString) {
  const TOPIC_REGEX = /\{topic=(.+?)\}/i;
  let match = replyString.match(TOPIC_REGEX);
  let depth = 0;
  let newTopic = '';

  while (match) {
    depth += 1;
    if (depth >= 50) {
      debug.verbose('Infinite loop looking for topic tag!');
      break;
    }
    newTopic = match[1];
    replyString = replyString.replace(new RegExp(`{topic=${Utils.quotemeta(newTopic)}}`, 'ig'), '');
    replyString = replyString.trim();
    match = replyString.match(TOPIC_REGEX); // Look for more
  }
  debug.verbose(`New topic to set: ${newTopic}. Cleaned reply string: ${replyString}`);
  return { replyString, newTopic };
};

const processAlternates = function processAlternates(reply) {
  // Reply Alternates.
  let match = reply.match(/\(\((.+?)\)\)/);
  let giveup = 0;
  while (match) {
    debug.verbose('Reply has Alternates');

    giveup += 1;
    if (giveup >= 50) {
      debug.verbose('Infinite loop when trying to process optionals in trigger!');
      return '';
    }

    const parts = match[1].split('|');
    const opts = [];
    for (let i = 0; i < parts.length; i++) {
      opts.push(parts[i].trim());
    }

    const resp = Utils.getRandomInt(0, opts.length - 1);
    reply = reply.replace(new RegExp(`\\(\\(\\s*${Utils.quotemeta(match[1])}\\s*\\)\\)`), opts[resp]);
    match = reply.match(/\(\((.+?)\)\)/);
  }

  return reply;
};

// Handle WordNet in Replies
const wordnetReplace = function wordnetReplace(match, sym, word, p3, offset, done) {
  wordnet.lookup(word, sym, (err, words) => {
    if (err) {
      console.log(err);
    }

    words = words.map(item => item.replace(/_/g, ' '));

    debug.verbose('Wordnet Replies', words);
    const resp = Utils.pickItem(words);
    done(null, resp);
  });
};

const addStateData = function addStateData(data) {
  const KEYVALG_REGEX = /\s*([a-z0-9]{2,20})\s*=\s*([a-z0-9\'\"]{2,20})\s*/ig;
  const KEYVALI_REGEX = /([a-z0-9]{2,20})\s*=\s*([a-z0-9\'\"]{2,20})/i;

  // Do something with the state
  const items = data.match(KEYVALG_REGEX);
  const stateData = {};

  for (let i = 0; i < items.length; i++) {
    const x = items[i].match(KEYVALI_REGEX);
    const key = x[1];
    let val = x[2];

    // for strings
    val = val.replace(/[\"\']/g, '');

    if (/^[\d]+$/.test(val)) {
      val = +val;
    }

    if (val === 'true' || val === 'false') {
      switch (val.toLowerCase().trim()) {
        case 'true': val = true; break;
        case 'false': val = false; break;
      }
    }
    stateData[key] = val;
  }

  return stateData;
};

export default {
  addStateData,
  getTopic,
  processAlternates,
  topicSetter,
  wordnetReplace,
};
