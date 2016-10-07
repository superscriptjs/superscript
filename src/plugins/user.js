import _ from 'lodash';
import debuglog from 'debug';

const debug = debuglog('SS:UserFacts');

const save = function save(key, value, cb) {
  const memory = this.user.memory;
  const userId = this.user.id;

  if (arguments.length !== 3) {
    console.log('WARNING\nValue not found in save function.');
    if (_.isFunction(value)) {
      cb = value;
      value = '';
    }
  }

  memory.db.get({ subject: key, predicate: userId }, (err, results) => {
    if (!_.isEmpty(results)) {
      memory.db.del(results[0], () => {
        memory.db.put({ subject: key, predicate: userId, object: value }, () => {
          cb(null, '');
        });
      });
    } else {
      memory.db.put({ subject: key, predicate: userId, object: value }, (err) => {
        cb(null, '');
      });
    }
  });
};

const hasItem = function hasItem(key, bool, cb) {
  const memory = this.user.memory;
  const userId = this.user.id;

  debug('getVar', key, bool, userId);
  memory.db.get({ subject: key, predicate: userId }, (err, res) => {
    if (!_.isEmpty(res)) {
      cb(null, (bool === 'true'));
    } else {
      cb(null, (bool === 'false'));
    }
  });
};

const get = function get(key, cb) {
  const memory = this.user.memory;
  const userId = this.user.id;

  debug('getVar', key, userId);

  memory.db.get({ subject: key, predicate: userId }, (err, res) => {
    if (res && res.length !== 0) {
      cb(err, res[0].object);
    } else {
      cb(err, '');
    }
  });
};

const createUserFact = function createUserFact(s, v, o, cb) {
  this.user.memory.create(s, v, o, false, () => {
    cb(null, '');
  });
};

const known = function known(bool, cb) {
  const memory = this.user.memory;
  const name = (this.message.names && !_.isEmpty(this.message.names)) ? this.message.names[0] : '';
  memory.db.get({ subject: name.toLowerCase() }, (err, res1) => {
    memory.db.get({ object: name.toLowerCase() }, (err, res2) => {
      if (_.isEmpty(res1) && _.isEmpty(res2)) {
        cb(null, (bool === 'false'));
      } else {
        cb(null, (bool === 'true'));
      }
    });
  });
};

const inTopic = function inTopic(topic, cb) {
  if (topic === this.user.currentTopic) {
    cb(null, 'true');
  } else {
    cb(null, 'false');
  }
};

export default {
  createUserFact,
  get,
  hasItem,
  inTopic,
  known,
  save,
};
