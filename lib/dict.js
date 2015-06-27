var _ = require("underscore");
var debug = require("debug")("Dict");

var Dict = function (wordArray) {
  this.words = [];

  for (var i = 0; i < wordArray.length; i++) {
    this.words.push({word: wordArray[i], position: i });
  }
};

Dict.prototype.add = function (name, array) {
  for (var i = 0; i < array.length; i++) {
    this.words[i][name] = array[i];
  }
};

Dict.prototype.get = function (word) {
  debug("Getting", word);
  for (var i = 0; i < this.words.length; i++) {
    if (this.words[i].word === word) {
      return this.words[i];
    }
    if (this.words[i].lemma === word) {
      return this.words[i];
    }
  }
};

Dict.prototype.contains = function (word) {
  var rv = false;
  for (var i = 0; i < this.words.length; i++) {
    if (this.words[i].word === word || this.words[i].lemma === word) {
      rv = true;
    }
  }
  return rv;
};

Dict.prototype.containsHLC = function (concept) {
  var rv = false;
  for (var i = 0; i < this.words.length; i++) {
    if (_.contains(this.words[i].hlc, concept)) {
      rv = true;
    }
  }
  return rv;
};

Dict.prototype.fetchHLC = function (thing) {
  for (var i = 0; i < this.words.length; i++) {
    if (_.contains(this.words[i].hlc, thing)) {
      return this.words[i];
    }
  }
};

Dict.prototype.fetch = function (list, thing) {
  var rl = [];
  for (var i = 0; i < this.words.length; i++) {
    if (_.isArray(thing)) {
      if (_.contains(thing, this.words[i][list])) {
        rl.push(this.words[i].lemma);
      }
    } else if (_.isArray(this.words[i][list])) {
      if (_.contains(this.words[i][list], thing)) {
        rl.push(this.words[i].lemma);
      }
    }
  }
  return rl;
};

Dict.prototype.addHLC = function (array) {
  debug("HLC", array);
  var extra = [];
  for (var i = 0; i < array.length; i++) {
    var word = array[i].word;
    var concepts = array[i].hlc;
    var item = this.get(word);
    if (item) {
      item.hlc = concepts;
    } else {
      debug("HLC Extra (or Missing) word/phrase", word);
      extra.push(word);
    }
  }
  return extra;
};

Dict.prototype.findByLem = function (word) {
  for (var i = 0; i < this.words.length; i++) {
    if (this.words[i].lemma === word) {
      return this.words[i];
    }
  }
};

module.exports = Dict;
