import pluralize from 'pluralize';
import debuglog from 'debug';
import utils from '../bot/utils';

const debug = debuglog('Word Plugin');

const plural = function plural(word, cb) {
  // Sometimes WordNet will give us more then one word
  let reply;
  const parts = word.split(' ');

  if (parts.length === 2) {
    reply = `${pluralize.plural(parts[0])} ${parts[1]}`;
  } else {
    reply = pluralize.plural(word);
  }

  cb(null, reply);
};

const not = function not(word, cb) {
  const words = word.split('|');
  const results = utils.inArray(this.message.words, words);
  debug('RES', results);
  cb(null, (results === false));
};

const lowercase = function lowercase(word, cb) {
  if (word) {
    cb(null, word.toLowerCase());
  } else {
    cb(null, '');
  }
};

export default {
  lowercase,
  not,
  plural,
};
