// This is a shim for wordnet lookup.
// http://wordnet.princeton.edu/wordnet/man/wninput.5WN.html

import _ from 'lodash';
import WordPOS from 'wordpos';

const wordpos = new WordPOS();

// Unhandled promises should throw top-level errors, not just silently fail
process.on('unhandledRejection', (err) => {
  throw err;
});

const define = async function define(word) {
  const results = await wordpos.lookup(word);
  if (_.isEmpty(results)) {
    throw new Error(`No results for wordnet definition of '${word}'`);
  }

  return results[0].def;
};

// Does a word lookup
// @word can be a word or a word/pos to filter out unwanted types
const lookup = async function lookup(word, pointerSymbol = '~') {
  let pos = null;

  const match = word.match(/~(\w)$/);
  if (match) {
    pos = match[1];
    word = word.replace(match[0], '');
  }

  const synets = [];

  const results = await wordpos.lookup(word);
  results.forEach((result) => {
    result.ptrs.forEach((part) => {
      if (pos !== null && part.pos === pos && part.pointerSymbol === pointerSymbol) {
        synets.push(part);
      } else if (pos === null && part.pointerSymbol === pointerSymbol) {
        synets.push(part);
      }
    });
  });

  let items = await Promise.all(synets.map(async (word) => {
    const sub = await wordpos.seek(word.synsetOffset, word.pos);
    return sub.lemma;
  }));

  items = _.uniq(items);
  items = items.map(x => x.replace(/_/g, ' '));
  return items;
};

// Used to explore a word or concept
// Spits out lots of info on the word
const explore = async function explore(word, cb) {
  let ptrs = [];

  const results = await wordpos.lookup(word);
  for (let i = 0; i < results.length; i++) {
    ptrs.push(results[i].ptrs);
  }

  ptrs = _.uniq(_.flatten(ptrs));
  ptrs = _.map(ptrs, item => ({ pos: item.pos, sym: item.pointerSymbol }));

  ptrs = _.chain(ptrs)
    .groupBy('pos')
    .map((value, key) => ({
      pos: key,
      ptr: _.uniq(_.map(value, 'sym')),
    }))
    .value();

  return Promise.all(ptrs.map(async item => Promise.all(item.ptr.map(async (ptr) => {
    const res = await lookup(`${word}~${item.pos}`, ptr);
    console.log(word, item.pos, ':', ptr, res.join(', '));
  }))));
};

export default {
  define,
  explore,
  lookup,
};
