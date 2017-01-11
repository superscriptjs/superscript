#!/usr/bin/env node

import program from 'commander';
import fs from 'fs';
import path from 'path';

program
  .version('1.0.0')
  .usage('botname [options]')
  .option('-c, --clients [telnet]', 'Bot clients (express, hangout, slack, telegram, telnet, twilio) [default: telnet]', 'telnet')
  .parse(process.argv);

if (!program.args[0]) {
  program.help();
  process.exit(1);
}

const botName = program.args[0];
const botPath = path.join(process.cwd(), botName);
const ssRoot = path.join(__dirname, '..', '..');

const write = function write(path, str, mode = 0o666) {
  fs.writeFileSync(path, str, { mode });
  console.log(`   \x1b[36mcreate\x1b[0m : ${path}`);
};

// Creating the path for your bot.
fs.mkdir(botPath, (err) => {
  if (err && err.code === 'EEXIST') {
    console.error(`\n\nThere is already a bot named ${botName} at ${botPath}.\nPlease remove it or pick a new name for your bot before continuing.\n`);
    process.exit(1);
  } else if (err) {
    console.error(`We could not create the bot: ${err}`);
    process.exit(1);
  }

  fs.mkdirSync(path.join(botPath, 'chat'));
  fs.mkdirSync(path.join(botPath, 'plugins'));
  fs.mkdirSync(path.join(botPath, 'src'));

  // package.json
  const pkg = {
    name: botName,
    version: '0.0.0',
    private: true,
    dependencies: {
      superscript: '^1.0.0',
    },
    devDependencies: {
      'babel-cli': '^6.16.0',
      'babel-preset-es2015': '^6.16.0',
    },
    scripts: {
      build: 'babel src --presets babel-preset-es2015 --out-dir lib',
    },
  };

  const clients = program.clients.split(',');

  clients.forEach((client) => {
    const clientName = client.toLowerCase();

    if (['express', 'hangout', 'slack', 'telegram', 'telnet', 'twilio'].indexOf(clientName) === -1) {
      console.log(`Cannot create bot with client type: ${clientName}`);
      return;
    }

    console.log(`Creating ${program.args[0]} bot with a ${clientName} client.`);

    // TODO: Pull out plugins that have dialogue and move them to the new bot.
    fs.createReadStream(path.join(ssRoot, 'clients', `${clientName}.js`))
      .pipe(fs.createWriteStream(path.join(botPath, 'src', `server-${clientName}.js`)));

    pkg.scripts.parse = 'parse -f';
    pkg.scripts[`start-${clientName}`] = `npm run build && node lib/server-${clientName}.js`;

    if (client === 'express') {
      pkg.dependencies.express = '4.x';
      pkg.dependencies['body-parser'] = '1.x';
    } else if (client === 'hangout') {
      pkg.dependencies['simple-xmpp'] = '1.x';
    } else if (client === 'slack') {
      pkg.dependencies['slack-client'] = '1.x';
    } else if (client === 'telegram') {
      pkg.dependencies['node-telegram-bot-api'] = '0.25.x';
    } else if (client === 'twilio') {
      pkg.dependencies.express = '4.x';
      pkg.dependencies['express-session'] = '1.x';
      pkg.dependencies['body-parser'] = '1.x';
      pkg.dependencies['connect-mongo'] = '1.x';
      pkg.dependencies.twilio = '2.x';
    }
  });

  const firstRule = "+ {^hasTag('hello')} *~2\n- Hi!\n- Hi, how are you?\n- How are you?\n- Hello\n- Howdy\n- Ola";

  write(path.join(botPath, 'package.json'), JSON.stringify(pkg, null, 2));
  write(path.join(botPath, 'chat', 'main.ss'), firstRule);
});
