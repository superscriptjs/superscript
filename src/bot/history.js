import _ from 'lodash';
import debuglog from 'debug-levels';

const debug = debuglog('SS:History');

// This function walks the history input and looks for utterances previously spoken
// to help answer the or solidify the statement
const historyLookup = function historyLookup(user, options) {
  debug.verbose('History Lookup with', options);

  const candidates = [];
  let nn;

  const moneyWords = (item) => {
    return item[1] === '$' ||
      item[0] === 'quid' ||
      item[0] === 'pounds' ||
      item[0] === 'dollars' ||
      item[0] === 'bucks' ||
      item[0] === 'cost';
  };

  for (let i = 0; i < user.__history__.input.length; i++) {
    let pobj = user.__history__.input[i];

    if (pobj !== undefined) {
      // TODO - See why we are getting a nested array.
      if (Array.isArray(pobj)) {
        pobj = pobj[0];
      }

      if (options.numbers || options.number) {
        if (pobj.numbers.length !== 0) {
          candidates.push(pobj);
        }
      }

      // Special case of number
      if (options.money === true && options.nouns) {
        if (pobj.numbers.length !== 0) {
          const t = [];
          if (_.any(pobj.taggedWords, moneyWords)) {
            t.push(pobj);

            // Now filter out the nouns
            for (let n = 0; n < t.length; n++) {
              nn = _.any(t[n].nouns, (item) => {
                for (let j = 0; j < options.nouns.length; j++) {
                  return options.nouns[i] === item ? true : false;
                }
              });
            }

            if (nn) {
              candidates.push(pobj);
            }
          }
        }
      } else if (options.money && pobj) {
        if (pobj.numbers.length !== 0) {
          if (_.any(pobj.taggedWords, moneyWords)) {
            candidates.push(pobj);
          }
        }
      } else if (options.nouns && pobj) {
        debug.verbose('Noun Lookup');
        if (_.isArray(options.nouns)) {
          var s = 0;
          var c = 0;

          nn = _.any(pobj.nouns, (item) => {
            const x = _.includes(options.nouns, item);
            c++;
            s = x ? s + 1 : s;
            return x;
          });

          if (nn) {
            pobj.score = s / c;
            candidates.push(pobj);
          }
        } else if (pobj.nouns.length !== 0) {
          candidates.push(pobj);
        }
      } else if (options.names && pobj) {
        debug.verbose('Name Lookup');

        if (_.isArray(options.names)) {
          nn = _.any(pobj.names, (item) => {
            return _.includes(options.names, item);
          });
          if (nn) {
            candidates.push(pobj);
          }
        } else if (pobj.names.length !== 0) {
          candidates.push(pobj);
        }
      } else if (options.adjectives && pobj) {
        debug.verbose('adjectives Lookup');
        if (_.isArray(options.adjectives)) {
          s = 0;
          c = 0;

          nn = _.any(pobj.adjectives, (item) => {
            const x = _.includes(options.adjectives, item);
            c++;
            s = x ? s + 1 : s;
            return x;
          });

          if (nn) {
            pobj.score = s / c;
            candidates.push(pobj);
          }
        } else if (pobj.adjectives.length !== 0) {
          candidates.push(pobj);
        }
      }

      if (options.date && pobj) {
        if (pobj.date !== null) {
          candidates.push(pobj);
        }
      }
    }
  }

  return candidates;
};

export default historyLookup;
