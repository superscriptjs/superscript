#!/usr/bin/env node

import program from 'commander';
import SuperScript from '../bot';

program
  .version('1.0.0')
  .option('--host [type]', 'Mongo Host', 'localhost')
  .option('--port [type]', 'Mongo Port', '27017')
  .option('--mongo [type]', 'Mongo Database Name', 'superscriptDB')
  .option('--mongoURI [type]', 'Mongo URI')
  .option('--importFile [type]', 'Parsed JSON file path', 'data.json')
  .parse(process.argv);

const mongoURI = process.env.MONGO_URI || program.mongoURI || `mongodb://${program.host}:${program.port}/${program.mongo}`;

// The use case of this file is to refresh a currently running bot.
// So the idea is to import a new file into a Mongo instance while preserving user data.
// For now, just nuke everything and import all the data into the database.

// TODO: Prevent clearing user data
// const collectionsToRemove = ['users', 'topics', 'replies', 'gambits'];

const options = {
  mongoURI,
  importFile: program.importFile,
};

SuperScript(options, (err) => {
  if (err) {
    console.error(err);
  }
  console.log('Everything has been imported.');
  process.exit();
});
