#!/usr/bin/env node

import program from 'commander';
import fs from 'fs';
import parser from 'ss-parser';
import facts from 'sfacts';

program
  .version('1.0.1')
  .option('-p, --path [type]', 'Input path', './chat')
  .option('-o, --output [type]', 'Output options', 'data.json')
  .option('-f, --force [type]', 'Force save if output file already exists', false)
  .option('-F, --facts [type]', 'Fact system files path', files => files.split(','), [])
  .parse(process.argv);

fs.exists(program.output, (exists) => {
  if (exists && !program.force) {
    console.log('File', program.output, 'already exists, remove file first or use -f to force save.');
    return process.exit();
  }

  return facts.load('mongodb://localhost/superscriptParse', program.facts, true, (err, factSystem) => {
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
