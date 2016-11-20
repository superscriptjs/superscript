#!/usr/bin/env node

import program from 'commander';
import fs from 'fs';
import parser from 'ss-parser';

program
  .version('1.0.0')
  .option('-p, --path [type]', 'Input path', './chat')
  .option('-o, --output [type]', 'Output options', 'data.json')
  .option('-f, --force [type]', 'Force save if output file already exists', false)
  .parse(process.argv);

fs.exists(program.output, (exists) => {
  if (!exists || program.force) {
    // TODO: Allow use of own fact system in this script
    parser.loadDirectory(program.path, (err, result) => {
      if (err) {
        console.error(`Error parsing bot script: ${err}`);
      }
      fs.writeFile(program.output, JSON.stringify(result, null, 4), (err) => {
        if (err) throw err;
        console.log(`Saved output to ${program.output}`);
      });
    });
  } else {
    console.log('File', program.output, 'already exists, remove file first or use -f to force save.');
  }
});
