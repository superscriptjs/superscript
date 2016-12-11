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
  this.user.setTopic(n, () => cb(null, ''));
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
  cb(null, `${this.extraScope.key} ${this.user.id} ${this.message.clean}`);
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

const hasName = function hasName(bool, cb) {
  this.user.getVar('name', (e, name) => {
    if (name !== null) {
      cb(null, (bool === 'true'));
    } else {
      // We have no name
      cb(null, (bool === 'false'));
    }
  });
};

const testCustomArgs = function testCustomArgs(myObj, myArr, cb) {
  const part1 = myObj.myKey;
  const part2 = myArr[0];
  cb(null, `${part1} ${part2}`);
};

const testMoreTags = function testMoreTags(topic, trigger, cb) {
  cb(null, `^topicRedirect("${topic}", "${trigger}")`);
};

// This function is called from the topic filter function
// Return true if you want the method to filter it out
const filterTopic = function(cb) {
  if (this.topic.name === "filter2") {
    cb(null, false);
  } else {
    cb(null, true);
  }
}

export default {
  bail,
  breakFunc,
  doSomething,
  changefunctionreply,
  changetopic,
  getUserId,
  hasFirstName,
  hasName,
  nobreak,
  num,
  objparam1,
  objparam2,
  one,
  showScope,
  testCustomArgs,
  testMoreTags,
  word,
  filterTopic,
};
