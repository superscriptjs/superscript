import _ from 'lodash';
import debuglog from 'debug';
import moment from 'moment';

import history from '../bot/history';
import Utils from '../bot/utils';
import wd from '../bot/reply/wordnet';

const debug = debuglog('Reason Plugin');

exports.hasName = function hasName(bool, cb) {
  this.user.getVar('name', (e, name) => {
    if (name !== null) {
      cb(null, (bool === 'true'));
    } else {
      // We have no name
      cb(null, (bool === 'false'));
    }
  });
};

exports.has = function has(value, cb) {
  this.user.getVar(value, (e, uvar) => {
    cb(null, (uvar === undefined));
  });
};

exports.findLoc = function findLoc(cb) {
  const candidates = history(this.user, { names: true });
  if (!_.isEmpty(candidates)) {
    debug('history candidates', candidates);
    const c = candidates[0];
    let suggest;

    if (c.names.length === 1) {
      suggest = `In ${c.names[0]}`;
    } else if (c.names.length === 2) {
      suggest = `In ${c.names[0]}, ${c.names[1]}.`;
    } else {
      suggest = `In ${Utils.pickItem(c.names)}`;
    }

    cb(null, suggest);
  } else {
    cb(null, "I'm not sure where you lived.");
  }
};

exports.tooAdjective = function tooAdjective(cb) {
  // what is/was too small?
  const message = this.message;
  const candidates = history(this.user, { adjectives: message.adjectives });
  debug('adj candidates', candidates);
  let suggest = '';

  if (candidates.length !== 0 && candidates[0].cNouns.length !== 0) {
    const choice = candidates[0].cNouns.filter(item => (item.length >= 3));
    const too = (message.adverbs.indexOf('too') !== -1) ? 'too ' : '';
    suggest = `The ${choice.pop()} was ${too}${message.adjectives[0]}.`;
    // suggest = "The " + choice.pop() + " was too " + message.adjectives[0] + ".";
  }

  cb(null, suggest);
};

exports.usedFor = function usedFor(cb) {
  const that = this;
  this.cnet.usedForForward(that.message.nouns[0], (e, r) => {
    if (!_.isEmpty(r)) {
      const res = (r) ? Utils.makeSentense(r[0].sentense) : '';
      cb(null, res);
    } else {
      cb(null, '');
    }
  });
};

exports.resolveFact = function resolveFact(cb) {
  // Resolve this
  const message = this.message;
  const t1 = message.nouns[0];
  const t2 = message.adjectives[0];

  this.cnet.resolveFact(t1, t2, (err, res) => {
    if (res) {
      cb(null, 'It sure is.');
    } else {
      cb(null, "I'm not sure.");
    }
  });
};


exports.putA = function putA(cb) {
  const thing = (this.message.entities[0]) ? this.message.entities[0] : this.message.nouns[0];

  if (thing) {
    this.cnet.putConcept(thing, (e, putThing) => {
      if (putThing) {
        cb(null, Utils.makeSentense(Utils.indefiniteArticlerize(putThing)));
      } else {
        cb(null, '');
      }
    });
  }
};

exports.isA = function isA(cb) {
  const that = this;
  let thing = (that.message.entities[0]) ? that.message.entities[0] : that.message.nouns[0];
  const userfacts = that.user.memory.db;
  const userID = that.user.name;

  if (thing) {
    this.cnet.isAForward(thing, (e, r) => {
      if (!_.isEmpty(r)) {
        const res = (r) ? Utils.makeSentense(r[0].sentense) : '';
        cb(null, res);
      } else {
        // Lets try wordnet
        wd.define(thing, (err, result) => {
          if (err) {
            cb(null, '');
          } else {
            cb(null, result);
          }
        });
      }
    });
  } else {
    thing = '';
    // my x is adj => what is adj
    if (that.message.adverbs[0]) {
      thing = that.message.adverbs[0];
    } else {
      thing = that.message.adjectives[0];
    }
    userfacts.get({ object: thing, predicate: userID }, (err, list) => {
      if (!_.isEmpty(list)) {
        // Because it came from userID it must be his
        cb(null, `You said your ${list[0].subject} is ${thing}.`);
      } else {
        // find example of thing?
        cb(null, '');
      }
    });
  }
};

exports.colorLookup = function colorLookup(cb) {
  const that = this;
  const message = this.message;
  const things = message.entities.filter(item => ((item !== 'color') ? item : null));
  let suggest = '';
  const facts = that.facts.db;
  const userfacts = that.user.memory.db;
  const botfacts = that.botfacts.db;
  const userID = that.user.name;

  // TODO: This could be improved adjectives may be empty
  const thing = (things.length === 1) ? things[0] : message.adjectives[0];

  if (thing !== '' && message.pnouns.length === 0) {
    // What else is green (AKA Example of green) OR
    // What color is a tree?

    const fthing = thing.toLowerCase().replace(' ', '_');

    // ISA on thing
    facts.get({ object: fthing, predicate: 'color' }, (err, list) => {
      if (!_.isEmpty(list)) {
        const thingOfColor = Utils.pickItem(list);
        const toc = thingOfColor.subject.replace(/_/g, ' ');

        cb(null, Utils.makeSentense(`${Utils.indefiniteArticlerize(toc)} is ${fthing}`));
      } else {
        facts.get({ subject: fthing, predicate: 'color' }, (err, list) => {
          if (!_.isEmpty(list)) {
            suggest = `It is ${list[0].object}.`;
            cb(null, suggest);
          } else {
            that.cnet.resolveFact('color', thing, (err, res) => {
              if (res) {
                suggest = `It is ${res}.`;
              } else {
                suggest = 'It depends, maybe brown?';
              }
              cb(null, suggest);
            });
          }
        });
      }
    });
  } else if (message.pronouns.length !== 0) {
    // Your or My color?
    // TODO: Lookup a saved or cached value.

    // what color is my car
    // what is my favoirute color
    if (message.pronouns.indexOf('my') !== -1) {
      // my car is x
      userfacts.get({ subject: message.nouns[1], predicate: userID }, (err, list) => {
        if (!_.isEmpty(list)) {
          const color = list[0].object;
          const lookup = message.nouns[1];
          const toSay = [`Your ${lookup} is ${color}.`];

          facts.get({ object: color, predicate: 'color' }, (err, list) => {
            if (!_.isEmpty(list)) {
              const thingOfColor = Utils.pickItem(list);
              const toc = thingOfColor.subject.replace(/_/g, ' ');
              toSay.push(`Your ${lookup} is the same color as a ${toc}.`);
            }
            cb(null, Utils.pickItem(toSay));
          });
        } else {
          // my fav color - we need
          const pred = message.entities[0];
          userfacts.get({ subject: thing, predicate: pred }, (err, list) => {
            debug('!!!!', list);
            if (!_.isEmpty(list)) {
              const color = list[0].object;
              cb(null, `Your ${thing} ${pred} is ${color}.`);
            } else {
              cb(null, `You never told me what color your ${thing} is.`);
            }
          });
        }
      });
    } else if (message.pronouns.indexOf('your') !== -1) {
      // Do I have a /thing/ and if so, what color could or would it be?

      botfacts.get({ subject: thing, predicate: 'color' }, (err, list) => {
        if (!_.isEmpty(list)) {
          const thingOfColor = Utils.pickItem(list);
          const toc = thingOfColor.object.replace(/_/g, ' ');
          cb(null, `My ${thing} color is ${toc}.`);
        } else {
          debug('---', { subject: thing, predicate: 'color' });
          // Do I make something up or just continue?
          cb(null, '');
        }
      });
    }
  } else {
    suggest = 'It is blue-green in color.';
    cb(null, suggest);
  }
};

exports.makeChoice = function makeChoice(cb) {
  if (!_.isEmpty(this.message.list)) {
    // Save the choice so we can refer to our decision later
    const sect = _.difference(this.message.entities, this.message.list);
    // So I believe sect[0] is the HEAD noun

    if (sect.length === 0) {
      // What do you like?
      const choice = Utils.pickItem(this.message.list);
      cb(null, `I like ${choice}.`);
    } else {
      // Which <noun> do you like?
      this.cnet.filterConcepts(this.message.list, sect[0], (err, results) => {
        const choice = Utils.pickItem(results);
        cb(null, `I like ${choice}.`);
      });
    }
  } else {
    cb(null, '');
  }
};

exports.findMoney = function findMoney(cb) {
  const candidates = history(this.user, { nouns: this.message.nouns, money: true });
  if (candidates.length !== 0) {
    cb(null, `It would cost $${candidates[0].numbers[0]}.`);
  } else {
    cb(null, 'Not sure.');
  }
};

exports.findDate = function findDate(cb) {
  const candidates = history(this.user, { date: true });
  if (candidates.length !== 0) {
    debug('DATE', candidates[0]);
    cb(null, `It is in ${moment(candidates[0].date).format('MMMM')}.`);
  } else {
    cb(null, 'Not sure.');
  }
};

exports.locatedAt = function locatedAt(cb) {
  debug('LocatedAt');
  const args = Array.prototype.slice.call(arguments);
  let place;

  if (args.length === 2) {
    place = args[0];
    cb = args[1];
  } else {
    cb = args[0];
    // Pull the place from the history
    const reply = this.user.getLastReply();
    if (reply && reply.nouns.length !== 0);
    place = reply.nouns.pop();
  }

  // var thing = entities.filter(function(item){if (item != "name") return item })
  this.cnet.atLocationReverse(place, (err, results) => {
    if (!_.isEmpty(results)) {
      const itemFound = Utils.pickItem(results);
      cb(null, Utils.makeSentense(`you might find ${Utils.indefiniteArticlerize(itemFound.c1_text)} at ${Utils.indefiniteArticlerize(place)}`));
    } else {
      cb(null, '');
    }
  });
};

// TODO: deprecate for acquireGoods
exports.aquireGoods = function aquireGoods(cb) {
  // Do you own a <thing>
  const that = this;
  const message = that.message;
  const thing = (message.entities[0]) ? message.entities[0] : message.nouns[0];
  const botfacts = that.botfacts.db;
  const cnet = that.cnet;
  let reason = '';

  botfacts.get({ subject: thing, predicate: 'ownedby', object: 'bot' }, (err, list) => {
    debug('!!!', list);
    if (!_.isEmpty(list)) {
      // Lets find out more about it.
      cb(null, 'Yes');
    } else {
      // find example of thing?
      // what is it?
      cnet.usedForForward(thing, (err, res) => {
        if (res) {
          reason = Utils.pickItem(res);
          reason = reason.frame2;
          botfacts.put({ subject: thing, predicate: 'ownedby', object: 'bot' }, (err, list) => {
            cb(null, `Yes, I used it for ${reason}.`);
          });
        } else {
          cb(null, 'NO');
        }
      });
    }
  });
};
