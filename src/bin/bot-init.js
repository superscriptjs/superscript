#!/usr/bin/env node

import program from 'commander';
import fs from 'fs';
import path from 'path';

program
  .version('1.0.0')
  .usage('botname [options]')
  .option('-c, --client [telnet]', 'Bot client (telnet or slack)', 'telnet')
  .parse(process.argv);

if (!program.args[0]) {
  program.help();
  process.exit(1);
}

const botName = program.args[0];
const botPath = path.join(process.cwd(), path.sep, botName);
const ssRoot = path.join(__dirname, '../../');
console.log('Creating %s bot with a %s client.', program.args[0], program.client);

const write = function write(path, str, mode = 0o666) {
  fs.writeFileSync(path, str, { mode });
  console.log(`   \x1b[36mcreate\x1b[0m : ${path}`);
};

// Creating the path for your bot.
fs.mkdir(botPath, (err, res) => {
  if (err && err.code === 'EEXIST') {
    console.log('\n\nThere is already a bot named %s at %s.\nPlease remove it or pick a new name for your bot before continuing.\n', botName, botPath);
    process.exit(1);
  } else if (err) {
    console.log('We could not create the bot.', err);
    process.exit(1);
  }

  fs.mkdirSync(path.join(botPath, path.sep, 'chat'));
  fs.mkdirSync(path.join(botPath, path.sep, 'plugins'));
  fs.mkdirSync(path.join(botPath, path.sep, 'src'));

  // TODO: Pull out plugins that have dialogue and move them to the new bot.
  fs.createReadStream(`${ssRoot}clients${path.sep}${program.client}.js`)
    .pipe(fs.createWriteStream(`${botPath + path.sep}src${path.sep}server.js`));

  // package.json
  const pkg = {
    name: botName,
    version: '0.0.0',
    private: true,
    dependencies: {
      superscript: 'alpha',
    },
    devDependencies: {
      'babel-cli': '^6.16.0',
      'babel-preset-es2015': '^6.16.0',
    },
    scripts: {
      build: 'babel src --presets babel-preset-es2015 --out-dir lib',
      start: 'npm run build && node lib/server.js',
    },
  };

  // TODO: Write dependencies for other clients

  if (program.client === 'slack') {
    pkg.dependencies['slack-client'] = '~1.2.2';
  }

  if (program.client === 'hangout') {
    pkg.dependencies['simple-xmpp'] = '~1.3.0';
  }

  const firstRule = '+ ~emohello *~2\n- Hi!\n- Hi, how are you?\n- How are you?\n- Hello\n- Howdy\n- Ola';

  write(path.join(botPath, path.sep, 'package.json'), JSON.stringify(pkg, null, 2));
  write(path.join(botPath, path.sep, 'chat', path.sep, 'main.ss'), firstRule);
});
