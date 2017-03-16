import debuglog from 'debug';
import _ from 'lodash';
import async from 'async';

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

export default {
  createFact
};
