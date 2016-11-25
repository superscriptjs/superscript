#!/usr/bin/env node
'use strict';

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _bot = require('../bot');

var _bot2 = _interopRequireDefault(_bot);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_commander2.default.version('1.0.0').option('--host [type]', 'Mongo Host', 'localhost').option('--port [type]', 'Mongo Port', '27017').option('--mongo [type]', 'Mongo Database Name', 'superscriptDB').option('--mongoURI [type]', 'Mongo URI').option('--importFile [type]', 'Parsed JSON file path', 'data.json').parse(process.argv);

var mongoURI = process.env.MONGO_URI || _commander2.default.mongoURI || 'mongodb://' + _commander2.default.host + ':' + _commander2.default.port + '/' + _commander2.default.mongo;

// The use case of this file is to refresh a currently running bot.
// So the idea is to import a new file into a Mongo instance while preserving user data.
// For now, just nuke everything and import all the data into the database.

// TODO: Prevent clearing user data
// const collectionsToRemove = ['users', 'topics', 'replies', 'gambits'];

var options = {
  mongoURI: mongoURI,
  importFile: _commander2.default.importFile
};

(0, _bot2.default)(options, function (err) {
  if (err) {
    console.error(err);
  }
  console.log('Everything has been imported.');
  process.exit();
});