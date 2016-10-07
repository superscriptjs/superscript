import fs from 'fs';
import _ from 'lodash';
import async from 'async';
import sfacts from 'sfacts';
import parser from 'ss-parser';

import SuperScript from '../src/bot/index';

let bot;

const getBot = function getBot() {
  return bot;
};

const data = [
  // './test/fixtures/concepts/bigrams.tbl', // Used in Reason tests
  // './test/fixtures/concepts/trigrams.tbl',
  // './test/fixtures/concepts/concepts.top',
  // './test/fixtures/concepts/verb.top',
  // './test/fixtures/concepts/color.tbl',
  // './test/fixtures/concepts/opp.tbl'
];

/* const botData = [
  './test/fixtures/concepts/botfacts.tbl',
  './test/fixtures/concepts/botown.tbl',
];*/

// If you want to use data in tests, then use bootstrap
const bootstrap = function bootstrap(cb) {
  sfacts.load('testFactSystem', data, false, (err, facts) => {
    if (err) {
      console.error(err);
    }
    cb(null, facts);
  });
};

const after = function after(end) {
  if (bot) {
    bot.factSystem.db.close(() => {
      // Kill the globals and remove any fact systems
      bot = null;
      async.each(['testFactSystem'], (item, next) => {
        sfacts.clean(item, next);
      }, () => end());
    });
  } else {
    end();
  }
};

const before = function before(file) {
  const options = {
    factSystem: {
      name: 'testFactSystem',
      clean: false,
    },
  };

  const afterParse = (fileCache, result, callback) => {
    fs.writeFile(fileCache, JSON.stringify(result), (err) => {
      options.importFile = fileCache;
      SuperScript(options, (err, botInstance) => {
        if (err) {
          return callback(err);
        }
        bot = botInstance;
        return callback();
      });
    });
  };

  return (done) => {
    const fileCache = `./test/fixtures/cache/${file}.json`;
    fs.exists(fileCache, (exists) => {
      if (!exists) {
        bootstrap((err, factSystem) => {
          parser.loadDirectory(`./test/fixtures/${file}`, { factSystem }, (err, result) => {
            if (err) {
              done(err);
            }
            afterParse(fileCache, result, done);
          });
        });
      } else {
        console.log(`Loading cached script from ${fileCache}`);
        let contents = fs.readFileSync(fileCache, 'utf-8');
        contents = JSON.parse(contents);

        bootstrap((err, factSystem) => {
          if (err) {
            done(err);
          }
          const checksums = contents.checksums;
          parser.loadDirectory(`./test/fixtures/${file}`, { factSystem, cache: checksums }, (err, result) => {
            if (err) {
              done(err);
            }
            const results = _.merge(contents, result);
            afterParse(fileCache, results, done);
          });
        });
      }
    });
  };
};

export default {
  after,
  before,
  getBot,
};
