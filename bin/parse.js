#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander');

var fs = require("fs");

program
  .version('0.0.1')
  .option('-p, --path [type]', 'Input Path', './topics')
  .option('-o, --output [type]', 'Output options', 'data.json')
  .option('-f, --force [type]', 'Force Save if output file already exists', false)
  .parse(process.argv);

if (program.output) console.log('parse topics');

var parse = require("../lib/parse")();
fs.exists(program.output, function (exists) {
  if (!exists || program.force === true) {
    parse.loadDirectory(program.path, function(err, result){
      fs.writeFile(program.output, JSON.stringify(result), function (err) {
        if (err) throw err;
        console.log('Saved output to ' + program.output);
      });
    });    
  } else {
    console.log("File", program.output, "already exists, remove file first or use -f to force save.");
  }
});