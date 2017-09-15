#!/usr/bin/env node

import program from 'commander';
import fs from 'fs';
import parser from 'ss-parser';
import facts from 'sfacts';

program
  .version('1.0.2')
  .option('-p, --path [type]', 'Input path', './chat')
  .option('-o, --output [type]', 'Output options', 'data.json')
  .option('-f, --force [type]', 'Force save if output file already exists', false)
  .option('-c, --clean [type]', 'Clean -> drops the mongodown collection', false)
  .option('-F, --facts [type]', 'Fact system files path', files => files.split(','), [])
  .option('--host [type]', 'Mongo Host', 'localhost')
  .option('--port [type]', 'Mongo Port', '27017')
  .option('--mongo [type]', 'Mongo Database Name', 'superscriptParse')
  .option('--mongoURI [type]', 'Mongo URI')
  .parse(process.argv);

const mongoURI = process.env.MONGO_URI
  || process.env.MONGODB_URI
  || program.mongoURI
  || `mongodb://${program.host}:${program.port}/${program.mongo}`;

fs.exists(program.output, (exists) => {
  if (exists && !program.force) {
    console.log('File', program.output, 'already exists, remove file first or use -f to force save.');
    return process.exit();
  }

  return facts.load(mongoURI, program.facts, program.clean, (err, factSystem) => {
    parser.parseDirectory(program.path, { factSystem }, (err, result) => {
      if (err) {
        console.error(`Error parsing bot script: ${err}`);
      }
      fs.writeFile(program.output, JSON.stringify(result, null, 4), (err) => {
        if (err) throw err;
        console.log(`Saved output to ${program.output}`);
        process.exit();
      });
    });
  });
});
