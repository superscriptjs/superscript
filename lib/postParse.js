const _ = require("lodash")
const RE2 = require('re2')


/**
 * Insert replacements into `source` string
 *
 * - `<basename>` gets replaced by `(replacements[0])`
 * - `<basenames>` gets replaced by `(replacements[0]|replacements[1]|...)`
 * - `<basenameN>` gets replaced by `(replacements[N])`
 *
 * @param {string} basename
 * @param {string} source
 * @param {Array} replacements
 * @returns {string}
 */
const replaceOneOrMore = (basename, source, replacements) => {
  const pronounsRE = new RE2(`<(${basename})([s0-${replacements.length}])?>`, 'g')
  if (pronounsRE.search(source) !== -1 && replacements.length !== 0) {
    return pronounsRE.replace(source, (c, p1, p2) => {
      if (p1 === 's') {
        return `(${replacements.join('|')})`
      } else {
        let index = Number.parseInt(p2)
        index = index ? index - 1 : 0
        return `(${replacements[index]})`
      }
    })
  } else {
    return source
  }
}


// This function can be done after the first and contains the
// user object so it may be contextual to this user.
exports.postParse = function (regexp, message, user, callback) {
  if (_.isNull(regexp)) {
    callback(null);
  } else {
    // todo: this can all be done in a single pass
    regexp = replaceOneOrMore('name', regexp, message.names)
    regexp = replaceOneOrMore('noun', regexp, message.nouns)
    regexp = replaceOneOrMore('adverb', regexp, message.adverbs)
    regexp = replaceOneOrMore('verb', regexp, message.verbs)
    regexp = replaceOneOrMore('pronoun', regexp, message.pronouns)
    regexp = replaceOneOrMore('adjective', regexp, message.adjectives)

    const inputOrReplyRE = new RE2('<(input|reply)([1-9])?>', 'g')
    if (inputOrReplyRE.search(regexp) !== -1) {
      const history = user.__history__
      regexp = inputOrReplyRE.replace(regexp, (c, p1, p2) => {
        const index = p2 ? Number.parseInt(p2) : 0
        return history[p1][index] ? history[p1][index].raw : c
      })
    }
  }

  callback(regexp);
};
