'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _history = require('../bot/history');

var _history2 = _interopRequireDefault(_history);

var _utils = require('../bot/utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug2.default)('Compare Plugin');

var createFact = function createFact(s, v, o, cb) {
  var _this = this;

  this.user.memory.create(s, v, o, false, function () {
    _this.facts.db.get({ subject: v, predicate: 'opposite' }, function (e, r) {
      if (r.length !== 0) {
        _this.user.memory.create(o, r[0].object, s, false, function () {
          cb(null, '');
        });
      } else {
        cb(null, '');
      }
    });
  });
};

var findOne = function findOne(haystack, arr) {
  return arr.some(function (v) {
    return haystack.indexOf(v) >= 0;
  });
};

var resolveAdjective = function resolveAdjective(cb) {
  var candidates = (0, _history2.default)(this.user, { names: true });
  var message = this.message;
  var userFacts = this.user.memory.db;
  var botFacts = this.facts.db;

  var getOpp = function getOpp(term, callback) {
    botFacts.search({
      subject: term,
      predicate: 'opposite',
      object: botFacts.v('opp')
    }, function (e, oppResult) {
      if (!_lodash2.default.isEmpty(oppResult)) {
        callback(null, oppResult[0].opp);
      } else {
        callback(null, null);
      }
    });
  };

  var negatedTerm = function negatedTerm(msg, names, cb) {
    // Are we confused about what we are looking for??!
    // Could be "least tall" negated terms
    if (_lodash2.default.contains(msg.adjectives, 'least') && msg.adjectives.length === 2) {
      // We need to flip the adjective to the oppisite and do a lookup.
      var cmpWord = _lodash2.default.without(msg.adjectives, 'least');
      getOpp(cmpWord[0], function (err, oppWord) {
        // TODO - What if there is no oppWord?
        // TODO - What if we have more than 2 names?

        debug('Lookup', oppWord, names);
        if (names.length === 2) {
          (function () {
            var pn1 = names[0].toLowerCase();
            var pn2 = names[1].toLowerCase();

            userFacts.get({ subject: pn1, predicate: oppWord, object: pn2 }, function (e, r) {
              // r is treated as 'truthy'
              if (!_lodash2.default.isEmpty(r)) {
                cb(null, _lodash2.default.capitalize(pn1) + ' is ' + oppWord + 'er.');
              } else {
                cb(null, _lodash2.default.capitalize(pn2) + ' is ' + oppWord + 'er.');
              }
            });
          })();
        } else {
          cb(null, _lodash2.default.capitalize(names) + ' is ' + oppWord + 'er.');
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
  var baseWord = null;
  var getAdjective = function getAdjective(m, cb) {
    var cmpWord = void 0;

    if (findOne(m.adjectives, ['least', 'less'])) {
      cmpWord = _lodash2.default.first(_lodash2.default.difference(m.adjectives, ['least', 'less']));
      baseWord = cmpWord;
      getOpp(cmpWord, cb);
    } else {
      cb(null, m.compareWords[0] ? m.compareWords[0] : m.adjectives[0]);
    }
  };

  // We may want to roll though all the candidates?!?
  // These examples are somewhat forced. (over fitted)
  if (candidates) {
    (function () {
      var prevMessage = candidates[0];

      if (prevMessage && prevMessage.names.length === 1) {
        cb(null, 'It is ' + prevMessage.names[0] + '.');
      } else if (prevMessage && prevMessage.names.length > 1) {
        // This could be:
        // Jane is older than Janet. Who is the youngest?
        // Jane is older than Janet. Who is the younger A or B?
        // My parents are John and Susan. What is my mother called?

        if (message.compareWords.length === 1 || message.adjectives.length === 1) {
          var handle = function handle(e, cmpTerms) {
            var compareWord = cmpTerms[0];
            var compareWord2 = cmpTerms[1];

            debug('CMP ', compareWord, compareWord2);

            botFacts.get({ subject: compareWord, predicate: 'opposite', object: compareWord2 }, function (e, oppResult) {
              debug('Looking for Opp of', compareWord, oppResult);

              // Jane is older than Janet. Who is the older Jane or Janet?
              if (!_lodash2.default.isEmpty(message.names)) {
                (function () {
                  debug('We have names', message.names);
                  // Make sure we say a name they are looking for.
                  var nameOne = message.names[0].toLowerCase();

                  userFacts.get({ subject: nameOne, predicate: compareWord }, function (e, result) {
                    if (_lodash2.default.isEmpty(result)) {
                      // So the fact is wrong, lets try the other way round

                      userFacts.get({ object: nameOne, predicate: compareWord }, function (e, result) {
                        debug('RES', result);

                        if (!_lodash2.default.isEmpty(result)) {
                          if (message.names.length === 2 && result[0].subject === message.names[1]) {
                            cb(null, _lodash2.default.capitalize(result[0].subject) + ' is ' + compareWord + 'er than ' + _lodash2.default.capitalize(result[0].object) + '.');
                          } else if (message.names.length === 2 && result[0].subject !== message.names[1]) {
                            // We can guess or do something more clever?
                            cb(null, _lodash2.default.capitalize(message.names[1]) + ' is ' + compareWord + 'er than ' + _lodash2.default.capitalize(result[0].object) + '.');
                          } else {
                            cb(null, _utils2.default.pickItem(message.names) + ' is ' + compareWord + 'er?');
                          }
                        } else {
                          // Lets do it again if we have another name
                          cb(null, _utils2.default.pickItem(message.names) + ' is ' + compareWord + 'er?');
                        }
                      });
                    } else {
                      // This could be a <-> b <-> c (is a << c ?)
                      userFacts.search([{ subject: nameOne, predicate: compareWord, object: userFacts.v('f') }, { subject: userFacts.v('f'), predicate: compareWord, object: userFacts.v('v') }], function (err, results) {
                        if (!_lodash2.default.isEmpty(results)) {
                          if (results[0].v === message.names[1].toLowerCase()) {
                            cb(null, _lodash2.default.capitalize(message.names[0]) + ' is ' + compareWord + 'er than ' + _lodash2.default.capitalize(message.names[1]) + '.');
                          } else {
                            // Test this
                            cb(null, _lodash2.default.capitalize(message.names[1]) + ' is ' + compareWord + 'er than ' + _lodash2.default.capitalize(message.names[0]) + '.');
                          }
                        } else {
                          // Test this block
                          cb(null, _utils2.default.pickItem(message.names) + ' is ' + compareWord + 'er?');
                        }
                      });
                    }
                  });
                })();
              } else {
                debug('NO NAMES');
                // Which of them is the <adj>?
                // This message has NO names
                // Jane is older than Janet. **Who is the older?**
                // Jane is older than Janet. **Who is the youngest?**

                // We pre-lemma the adjactives, so we need to fetch the raw word from the dict.
                // We could have "Who is the oldest"
                // If the word has been flipped, it WONT be in the dictionary, but we have a cache of it
                var fullCompareWord = baseWord ? message.dict.findByLem(baseWord).word : message.dict.findByLem(compareWord).word;

                // Looking for an end term
                if (fullCompareWord.indexOf('est') > 0) {
                  userFacts.search([{ subject: userFacts.v('oldest'),
                    predicate: compareWord,
                    object: userFacts.v('rand1') }, { subject: userFacts.v('oldest'),
                    predicate: compareWord,
                    object: userFacts.v('rand2') }], function (err, results) {
                    if (!_lodash2.default.isEmpty(results)) {
                      cb(null, _lodash2.default.capitalize(results[0].oldest) + ' is the ' + compareWord + 'est.');
                    } else {
                      // Pick one.
                      cb(null, _lodash2.default.capitalize(_utils2.default.pickItem(prevMessage.names)) + ' is the ' + compareWord + 'est.');
                    }
                  });
                } else {
                  if (!_lodash2.default.isEmpty(oppResult)) {
                    // They are oppisite, but lets check to see if we have a true fact

                    userFacts.get({ subject: prevMessage.names[0].toLowerCase(), predicate: compareWord }, function (e, result) {
                      if (!_lodash2.default.isEmpty(result)) {
                        if (message.qSubType === 'YN') {
                          cb(null, 'Yes, ' + _lodash2.default.capitalize(result[0].object) + ' is ' + compareWord + 'er.');
                        } else {
                          cb(null, _lodash2.default.capitalize(result[0].object) + ' is ' + compareWord + 'er than ' + prevMessage.names[0] + '.');
                        }
                      } else {
                        if (message.qSubType === 'YN') {
                          cb(null, 'Yes, ' + _lodash2.default.capitalize(prevMessage.names[1]) + ' is ' + compareWord + 'er.');
                        } else {
                          cb(null, _lodash2.default.capitalize(prevMessage.names[1]) + ' is ' + compareWord + 'er than ' + prevMessage.names[0] + '.');
                        }
                      }
                    });
                  } else if (compareWord === compareWord2) {
                    // They are the same adjectives
                    // No names.
                    if (message.qSubType === 'YN') {
                      cb(null, 'Yes, ' + _lodash2.default.capitalize(prevMessage.names[0]) + ' is ' + compareWord + 'er.');
                    } else {
                      cb(null, _lodash2.default.capitalize(prevMessage.names[0]) + ' is ' + compareWord + 'er than ' + prevMessage.names[1] + '.');
                    }
                  } else {
                    // not opposite terms.
                    cb(null, "Those things don't make sense to compare.");
                  }
                }
              }
            });
          };

          _async2.default.map([message, prevMessage], getAdjective, handle);
        } else {
          negatedTerm(message, prevMessage.names, cb);
        }
      }
    })();
  } else {
    cb(null, '??');
  }
};

exports.default = {
  createFact: createFact,
  resolveAdjective: resolveAdjective
};