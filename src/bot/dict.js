import _ from 'lodash';
import debuglog from 'debug-levels';

const debug = debuglog('SS:Dict');

class Dict {
  constructor(wordArray) {
    this.words = [];

    for (let i = 0; i < wordArray.length; i++) {
      this.words.push({ word: wordArray[i], position: i });
    }
  }

  add(key, array) {
    for (let i = 0; i < array.length; i++) {
      this.words[i][key] = array[i];
    }
  }

  get(word) {
    debug.verbose(`Getting word from dictionary: ${word}`);
    for (let i = 0; i < this.words.length; i++) {
      if (this.words[i].word === word || this.words[i].lemma === word) {
        return this.words[i];
      }
    }
    return null;
  }

  contains(word) {
    for (let i = 0; i < this.words.length; i++) {
      if (this.words[i].word === word || this.words[i].lemma === word) {
        return true;
      }
    }
    return false;
  }

  addHLC(array) {
    debug.verbose(`Adding HLCs to dictionary: ${array}`);
    const extra = [];
    for (let i = 0; i < array.length; i++) {
      const word = array[i].word;
      const concepts = array[i].hlc;
      const item = this.get(word);
      if (item) {
        item.hlc = concepts;
      } else {
        debug.verbose(`HLC extra or missing for word/phrase: ${word}`);
        extra.push(word);
      }
    }
    return extra;
  }

  getHLC(concept) {
    for (let i = 0; i < this.words.length; i++) {
      if (_.includes(this.words[i].hlc, concept)) {
        return this.words[i];
      }
    }
    return null;
  }

  containsHLC(concept) {
    for (let i = 0; i < this.words.length; i++) {
      if (_.includes(this.words[i].hlc, concept)) {
        return true;
      }
    }
    return false;
  }

  fetch(list, thing) {
    const results = [];
    for (let i = 0; i < this.words.length; i++) {
      if (_.isArray(thing)) {
        if (_.includes(thing, this.words[i][list])) {
          results.push(this.words[i].lemma);
        }
      } else if (_.isArray(this.words[i][list])) {
        if (_.includes(this.words[i][list], thing)) {
          results.push(this.words[i].lemma);
        }
      }
    }
    return results;
  }

  findByLem(word) {
    for (let i = 0; i < this.words.length; i++) {
      if (this.words[i].lemma === word) {
        return this.words[i];
      }
    }
    return null;
  }
}

export default Dict;
