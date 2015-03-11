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
var ssRoot = path.join(__dirname, "../");
console.log("Creating %s bot with a %s client.", program.args[0], program.client);

function write(path, str, mode) {
  fs.writeFileSync(path, str, { mode: mode || 0666 });
  console.log('   \x1b[36mcreate\x1b[0m : ' + path);
}

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
  
  fs.createReadStream(ssRoot + path.sep + "clients" + path.sep + program.client + '.js').pipe(fs.createWriteStream(botPath + path.sep + 'server.js'));

  // package.json
  var pkg = {
      name: botName
    , version: '0.0.0'
    , private: true
    , dependencies: {
       'superscript': 'latest'
      , 'sfacts':'latest'
      , 'mongoose':'3.8.24'
      ,'debug': '~2.0.0'
    }
  }

  if (program.client == "slack") {
    pkg.dependencies['slack-client'] = '~1.2.2'; 
  }

  var firstRule = "+ ~emohello [*~2]\n- Hi!\n- Hi, how are you?\n- How are you?\n- Hello\n- Howdy\n- Ola"
   
  write(path.join(botPath, path.sep, 'package.json'), JSON.stringify(pkg, null, 2));
  write(path.join(botPath, path.sep, 'topics', path.sep, 'main.ss'), firstRule);
});
