import wd from '../bot/reply/wordnet';

const wordnetDefine = function wordnetDefine(cb) {
  const args = Array.prototype.slice.call(arguments);
  let word;

  if (args.length === 2) {
    word = args[0];
  } else {
    word = this.message.words.pop();
  }

  wd.define(word).then((result) => {
    cb(null, `The Definition of ${word} is ${result}`);
  }).catch(() => {
    cb(null, `There is no definition for the word ${word}!`);
  });
};

export default { wordnetDefine };
