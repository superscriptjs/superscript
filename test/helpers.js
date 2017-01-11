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
  sfacts.load('mongodb://localhost/superscripttest', data, true, (err, facts) => {
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
      async.each(['mongodb://localhost/superscripttest'], (item, next) => {
        sfacts.clean(item, next);
      }, end);
    });
  } else {
    end();
  }
};

const parse = function parse(file, callback) {
  const fileCache = `${__dirname}/fixtures/cache/${file}.json`;
  fs.exists(fileCache, (exists) => {
    if (!exists) {
      bootstrap((err, factSystem) => {
        parser.parseDirectory(`${__dirname}/fixtures/${file}`, { factSystem }, (err, result) => {
          if (err) {
            return callback(err);
          }
          return callback(null, fileCache, result);
        });
      });
    } else {
      console.log(`Loading cached script from ${fileCache}`);
      let contents = fs.readFileSync(fileCache, 'utf-8');
      contents = JSON.parse(contents);

      bootstrap((err, factSystem) => {
        if (err) {
          return callback(err);
        }
        const checksums = contents.checksums;
        return parser.parseDirectory(`${__dirname}/fixtures/${file}`, { factSystem, cache: checksums }, (err, result) => {
          if (err) {
            return callback(err);
          }
          const results = _.merge(contents, result);
          return callback(null, fileCache, results);
        });
      });
    }
  });
};

const saveToCache = function saveToCache(fileCache, result, callback) {
  fs.exists(`${__dirname}/fixtures/cache`, (exists) => {
    if (!exists) {
      fs.mkdirSync(`${__dirname}/fixtures/cache`);
    }
    return fs.writeFile(fileCache, JSON.stringify(result), (err) => {
      if (err) {
        return callback(err);
      }
      return callback();
    });
  });
};

const parseAndSaveToCache = function parseAndSaveToCache(file, callback) {
  parse(file, (err, fileCache, result) => {
    if (err) {
      return callback(err);
    }
    return saveToCache(fileCache, result, (err) => {
      if (err) {
        return callback(err);
      }
      return callback(null, fileCache);
    });
  });
};

const setupBot = function setupBot(fileCache, multitenant, callback) {
  const options = {
    mongoURI: 'mongodb://localhost/superscripttest',
    factSystem: {
      clean: false,
    },
    logPath: null,
    pluginsPath: null,
    importFile: fileCache,
    useMultitenancy: multitenant,
  };

  return SuperScript.setup(options, (err, botInstance) => {
    if (err) {
      return callback(err);
    }
    bot = botInstance;
    return callback();
  });
};

const before = function before(file, multitenant = false) {
  return (done) => {
    parseAndSaveToCache(file, (err, fileCache) => {
      if (err) {
        return done(err);
      }
      return setupBot(fileCache, multitenant, done);
    });
  };
};

export default {
  after,
  before,
  getBot,
  parseAndSaveToCache,
  setupBot,
};
