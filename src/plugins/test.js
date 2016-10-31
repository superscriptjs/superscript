import _ from 'lodash';

// This is used in a test to verify fall though works
// TODO: Move this into a fixture.
const bail = function bail(cb) {
  cb(true, null);
};

const one = function one(cb) {
  cb(null, 'one');
};

const num = function num(n, cb) {
  cb(null, n);
};

const changetopic = function changetopic(n, cb) {
  this.user.setTopic(n);
  cb(null, '');
};

const changefunctionreply = function changefunctionreply(newtopic, cb) {
  cb(null, `{topic=${newtopic}}`);
};

const doSomething = function doSomething(cb) {
  console.log('this.message.raw', this.message.raw);
  cb(null, 'function');
};

const breakFunc = function breakFunc(cb) {
  cb(null, '', true);
};

const nobreak = function nobreak(cb) {
  cb(null, '', false);
};

const objparam1 = function objparam1(cb) {
  const data = {
    text: 'world',
    attachments: [
      {
        text: 'Optional text that appears *within* the attachment',
      },
    ],
  };
  cb(null, data);
};

const objparam2 = function objparam2(cb) {
  cb(null, { test: 'hello', text: 'world' });
};


const showScope = function showScope(cb) {
  cb(null, `${this.message_props.key} ${this.user.id} ${this.message.clean}`);
};

const word = function word(word1, word2, cb) {
  cb(null, word1 === word2);
};

const hasFirstName = function hasFirstName(bool, cb) {
  this.user.getVar('firstName', (e, name) => {
    if (name !== null) {
      cb(null, (bool === 'true'));
    } else {
      cb(null, (bool === 'false'));
    }
  });
};

const getUserId = function getUserId(cb) {
  const userID = this.user.id;
  const that = this;
  // console.log("CMP1", _.isEqual(userID, that.user.id));
  return that.bot.getUser('userB', (err, user) => {
    console.log('CMP2', _.isEqual(userID, that.user.id));
    cb(null, that.user.id);
  });
};

export default {
  bail,
  breakFunc,
  doSomething,
  changefunctionreply,
  changetopic,
  getUserId,
  hasFirstName,
  nobreak,
  num,
  objparam1,
  objparam2,
  one,
  showScope,
  word,
};
