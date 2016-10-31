import debuglog from 'debug';
import _ from 'lodash';
import async from 'async';

import history from '../bot/history';
import Utils from '../bot/utils';

const debug = debuglog('Compare Plugin');

const createFact = function createFact(s, v, o, cb) {
  this.user.memory.create(s, v, o, false, () => {
    this.facts.db.get({ subject: v, predicate: 'opposite' }, (e, r) => {
      if (r.length !== 0) {
        this.user.memory.create(o, r[0].object, s, false, () => {
          cb(null, '');
        });
      } else {
        cb(null, '');
      }
    });
  });
};

const findOne = function findOne(haystack, arr) {
  return arr.some(v => (haystack.indexOf(v) >= 0));
};

const resolveAdjective = function resolveAdjective(cb) {
  const candidates = history(this.user, { names: true });
  const message = this.message;
  const userFacts = this.user.memory.db;
  const botFacts = this.facts.db;

  const getOpp = function getOpp(term, callback) {
    botFacts.search({
      subject: term,
      predicate: 'opposite',
      object: botFacts.v('opp'),
    }, (e, oppResult) => {
      if (!_.isEmpty(oppResult)) {
        callback(null, oppResult[0].opp);
      } else {
        callback(null, null);
      }
    });
  };

  const negatedTerm = function negatedTerm(msg, names, cb) {
    // Are we confused about what we are looking for??!
    // Could be "least tall" negated terms
    if (_.contains(msg.adjectives, 'least') && msg.adjectives.length === 2) {
      // We need to flip the adjective to the oppisite and do a lookup.
      const cmpWord = _.without(msg.adjectives, 'least');
      getOpp(cmpWord[0], (err, oppWord) => {
        // TODO - What if there is no oppWord?
        // TODO - What if we have more than 2 names?

        debug('Lookup', oppWord, names);
        if (names.length === 2) {
          const pn1 = names[0].toLowerCase();
          const pn2 = names[1].toLowerCase();

          userFacts.get({ subject: pn1, predicate: oppWord, object: pn2 }, (e, r) => {
            // r is treated as 'truthy'
            if (!_.isEmpty(r)) {
              cb(null, `${_.capitalize(pn1)} is ${oppWord}er.`);
            } else {
              cb(null, `${_.capitalize(pn2)} is ${oppWord}er.`);
            }
          });
        } else {
          cb(null, `${_.capitalize(names)} is ${oppWord}er.`);
        }
      });
    } else {
      // We have no idea what they are searching for
      cb(null, '???');
    }
  };

  // This will return the adjective from the message, or the oppisite term in some cases
  // "least short" => tall
  // "less tall" => short
  let baseWord = null;
  const getAdjective = function getAdjective(m, cb) {
    let cmpWord;

    if (findOne(m.adjectives, ['least', 'less'])) {
      cmpWord = _.first(_.difference(m.adjectives, ['least', 'less']));
      baseWord = cmpWord;
      getOpp(cmpWord, cb);
    } else {
      cb(null, (m.compareWords[0]) ? m.compareWords[0] : m.adjectives[0]);
    }
  };

  // We may want to roll though all the candidates?!?
  // These examples are somewhat forced. (over fitted)
  if (candidates) {
    const prevMessage = candidates[0];

    if (prevMessage && prevMessage.names.length === 1) {
      cb(null, `It is ${prevMessage.names[0]}.`);
    } else if (prevMessage && prevMessage.names.length > 1) {
      // This could be:
      // Jane is older than Janet. Who is the youngest?
      // Jane is older than Janet. Who is the younger A or B?
      // My parents are John and Susan. What is my mother called?

      if ((message.compareWords.length === 1 || message.adjectives.length === 1)) {
        const handle = (e, cmpTerms) => {
          const compareWord = cmpTerms[0];
          const compareWord2 = cmpTerms[1];

          debug('CMP ', compareWord, compareWord2);

          botFacts.get({ subject: compareWord, predicate: 'opposite', object: compareWord2 }, (e, oppResult) => {
            debug('Looking for Opp of', compareWord, oppResult);

            // Jane is older than Janet. Who is the older Jane or Janet?
            if (!_.isEmpty(message.names)) {
              debug('We have names', message.names);
              // Make sure we say a name they are looking for.
              const nameOne = message.names[0].toLowerCase();

              userFacts.get({ subject: nameOne, predicate: compareWord }, (e, result) => {
                if (_.isEmpty(result)) {
                  // So the fact is wrong, lets try the other way round

                  userFacts.get({ object: nameOne, predicate: compareWord }, (e, result) => {
                    debug('RES', result);

                    if (!_.isEmpty(result)) {
                      if (message.names.length === 2 && result[0].subject === message.names[1]) {
                        cb(null, `${_.capitalize(result[0].subject)} is ${compareWord}er than ${_.capitalize(result[0].object)}.`);
                      } else if (message.names.length === 2 && result[0].subject !== message.names[1]) {
                        // We can guess or do something more clever?
                        cb(null, `${_.capitalize(message.names[1])} is ${compareWord}er than ${_.capitalize(result[0].object)}.`);
                      } else {
                        cb(null, `${Utils.pickItem(message.names)} is ${compareWord}er?`);
                      }
                    } else {
                      // Lets do it again if we have another name
                      cb(null, `${Utils.pickItem(message.names)} is ${compareWord}er?`);
                    }
                  });
                } else {
                  // This could be a <-> b <-> c (is a << c ?)
                  userFacts.search([
                    { subject: nameOne, predicate: compareWord, object: userFacts.v('f') },
                    { subject: userFacts.v('f'), predicate: compareWord, object: userFacts.v('v') },
                  ], (err, results) => {
                    if (!_.isEmpty(results)) {
                      if (results[0].v === message.names[1].toLowerCase()) {
                        cb(null, `${_.capitalize(message.names[0])} is ${compareWord}er than ${_.capitalize(message.names[1])}.`);
                      } else {
                        // Test this
                        cb(null, `${_.capitalize(message.names[1])} is ${compareWord}er than ${_.capitalize(message.names[0])}.`);
                      }
                    } else {
                      // Test this block
                      cb(null, `${Utils.pickItem(message.names)} is ${compareWord}er?`);
                    }
                  });
                }
              });
            } else {
              debug('NO NAMES');
              // Which of them is the <adj>?
              // This message has NO names
              // Jane is older than Janet. **Who is the older?**
              // Jane is older than Janet. **Who is the youngest?**

              // We pre-lemma the adjactives, so we need to fetch the raw word from the dict.
              // We could have "Who is the oldest"
              // If the word has been flipped, it WONT be in the dictionary, but we have a cache of it
              const fullCompareWord = (baseWord) ?
                message.dict.findByLem(baseWord).word :
                message.dict.findByLem(compareWord).word;


              // Looking for an end term
              if (fullCompareWord.indexOf('est') > 0) {
                userFacts.search([
                  { subject: userFacts.v('oldest'),
                    predicate: compareWord,
                    object: userFacts.v('rand1') },
                  { subject: userFacts.v('oldest'),
                    predicate: compareWord,
                    object: userFacts.v('rand2') },
                ], (err, results) => {
                  if (!_.isEmpty(results)) {
                    cb(null, `${_.capitalize(results[0].oldest)} is the ${compareWord}est.`);
                  } else {
                    // Pick one.
                    cb(null, `${_.capitalize(Utils.pickItem(prevMessage.names))} is the ${compareWord}est.`);
                  }
                });
              } else {
                if (!_.isEmpty(oppResult)) {
                  // They are oppisite, but lets check to see if we have a true fact

                  userFacts.get({ subject: prevMessage.names[0].toLowerCase(), predicate: compareWord }, (e, result) => {
                    if (!_.isEmpty(result)) {
                      if (message.qSubType === 'YN') {
                        cb(null, `Yes, ${_.capitalize(result[0].object)} is ${compareWord}er.`);
                      } else {
                        cb(null, `${_.capitalize(result[0].object)} is ${compareWord}er than ${prevMessage.names[0]}.`);
                      }
                    } else {
                      if (message.qSubType === 'YN') {
                        cb(null, `Yes, ${_.capitalize(prevMessage.names[1])} is ${compareWord}er.`);
                      } else {
                        cb(null, `${_.capitalize(prevMessage.names[1])} is ${compareWord}er than ${prevMessage.names[0]}.`);
                      }
                    }
                  });
                } else if (compareWord === compareWord2) {
                  // They are the same adjectives
                  // No names.
                  if (message.qSubType === 'YN') {
                    cb(null, `Yes, ${_.capitalize(prevMessage.names[0])} is ${compareWord}er.`);
                  } else {
                    cb(null, `${_.capitalize(prevMessage.names[0])} is ${compareWord}er than ${prevMessage.names[1]}.`);
                  }
                } else {
                  // not opposite terms.
                  cb(null, "Those things don't make sense to compare.");
                }
              }
            }
          });
        };

        async.map([message, prevMessage], getAdjective, handle);
      } else {
        negatedTerm(message, prevMessage.names, cb);
      }
    }
  } else {
    cb(null, '??');
  }
};

export default {
  createFact,
  resolveAdjective,
};
