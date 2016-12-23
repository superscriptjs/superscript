import _ from 'lodash';

const searchRE = /<(name|noun|adverb|verb|pronoun|adjective)(s|[0-9]+)?>/g;
const inputReplyRE = /<(input|reply)([1-9])?>/g;

/**
 * This function replaces syntax in the trigger such as:
 * <noun1> <adverb2> <pronoun2>
 * with the respective word in the user's message.
 *
 * - `<basename>` gets replaced by `(replacements[0])`
 * - `<basenames>` gets replaced by `(replacements[0]|replacements[1]|...)`
 * - `<basenameN>` gets replaced by `(replacements[N])`
 *
 * This function contains the user object so it may be contextual to this user.
 */
const postParse = function postParse(regexp, message, user) {
  if (_.isNull(regexp)) {
    return null;
  }

  regexp = regexp.replace(searchRE, (match, p1, p2) => {
    let replacements = null;

    switch (p1) {
      case 'name': replacements = message.names; break;
      case 'noun': replacements = message.nouns; break;
      case 'adverb': replacements = message.adverbs; break;
      case 'verb': replacements = message.verbs; break;
      case 'pronoun': replacements = message.pronouns; break;
      case 'adjective': replacements = message.adjectives; break;
      default: break;
    }

    if (replacements.length > 0) {
      if (p2 === 's') {
        return `(${replacements.join('|')})`;
      }

      let index = Number.parseInt(p2);
      index = index ? index - 1 : 0;
      if (index < replacements.length) {
        return `(${replacements[index]})`;
      }
    }

    return '';
  });

  if (user && user.history) {
    const history = user.history;
    regexp = regexp.replace(inputReplyRE, (match, p1, p2) => {
      const index = p2 ? Number.parseInt(p2) : 0;
      return history[p1][index] ? history[p1][index].raw : match;
    });
  }

  return regexp;
};

export default postParse;
