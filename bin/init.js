#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander');
var fs = require("fs");
var path = require("path");

program
  .version('0.0.1')
  .usage('botname [options]')
  .option('-c, --client [telnet]', 'Bot client (telnet or slack)', 'telnet')
  .parse(process.argv);

// console.log(program);
if (program.output) console.log('Init new Bot');

if (!program.args[0]) {
  program.help();
  process.exit(1)
}

var botName = program.args[0];
var botPath = path.join(process.cwd(), path.sep, botName);
console.log("Creating %s bot with a %s client.", program.args[0], program.client);

// Creating the path for your bot.
fs.mkdir(botPath, function(err, res){
  if (err && err.code === "EEXIST") {
    console.log("\n\nThere is already a bot named %s at %s.\nPlease remove it or pick a new name for your bot before continuing.\n", botName, botPath);
    process.exit(1)
  } else if (err) {
    console.log("We could not create the bot.", err);
    process.exit(1)
  }

  fs.mkdirSync(path.join(botPath, path.sep, "topics"));
  fs.mkdirSync(path.join(botPath, path.sep, "plugins"));
  fs.mkdirSync(path.join(botPath, path.sep, "logs"));
  
  // TODO: Pull out plugins that have dialogue and move them to the new bot.
  
  fs.createReadStream("clients" + path.sep + program.client + '.js').pipe(fs.createWriteStream(botPath + path.sep + 'server.js'));

});
