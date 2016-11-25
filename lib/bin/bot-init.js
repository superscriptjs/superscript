#!/usr/bin/env node
'use strict';

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_commander2.default.version('1.0.0').usage('botname [options]').option('-c, --client [telnet]', 'Bot client (telnet or slack)', 'telnet').parse(process.argv);

if (!_commander2.default.args[0]) {
  _commander2.default.help();
  process.exit(1);
}

var botName = _commander2.default.args[0];
var botPath = _path2.default.join(process.cwd(), _path2.default.sep, botName);
var ssRoot = _path2.default.join(__dirname, '../../');

var write = function write(path, str) {
  var mode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 438;

  _fs2.default.writeFileSync(path, str, { mode: mode });
  console.log('   \x1B[36mcreate\x1B[0m : ' + path);
};

// Creating the path for your bot.
_fs2.default.mkdir(botPath, function (err, res) {
  if (err && err.code === 'EEXIST') {
    console.log('\n\nThere is already a bot named %s at %s.\nPlease remove it or pick a new name for your bot before continuing.\n', botName, botPath);
    process.exit(1);
  } else if (err) {
    console.log('We could not create the bot.', err);
    process.exit(1);
  }

  _fs2.default.mkdirSync(_path2.default.join(botPath, _path2.default.sep, 'chat'));
  _fs2.default.mkdirSync(_path2.default.join(botPath, _path2.default.sep, 'plugins'));
  _fs2.default.mkdirSync(_path2.default.join(botPath, _path2.default.sep, 'src'));

  // package.json
  var pkg = {
    name: botName,
    version: '0.0.0',
    private: true,
    dependencies: {
      superscript: 'alpha'
    },
    devDependencies: {
      'babel-cli': '^6.16.0',
      'babel-preset-es2015': '^6.16.0'
    },
    scripts: {
      build: 'babel src --presets babel-preset-es2015 --out-dir lib'
    }
  };

  var clients = _commander2.default.client.split(',');

  clients.forEach(function (client) {
    if (['telnet', 'slack'].indexOf(client) === -1) {
      console.log('Cannot create bot with client type: ' + client);
      return;
    }

    console.log('Creating ' + _commander2.default.args[0] + ' bot with a ' + client + ' client.');

    var clientName = client.charAt(0).toUpperCase() + client.slice(1);

    // TODO: Pull out plugins that have dialogue and move them to the new bot.
    _fs2.default.createReadStream(ssRoot + 'clients' + _path2.default.sep + client + '.js').pipe(_fs2.default.createWriteStream(botPath + _path2.default.sep + 'src' + _path2.default.sep + 'server' + clientName + '.js'));

    pkg.scripts['start' + clientName] = 'npm run build && node lib/server' + clientName + '.js';

    // TODO: Write dependencies for other clients

    if (client === 'slack') {
      pkg.dependencies['slack-client'] = '~1.2.2';
    }

    if (client === 'hangout') {
      pkg.dependencies['simple-xmpp'] = '~1.3.0';
    }
  });

  var firstRule = '+ ~emohello *~2\n- Hi!\n- Hi, how are you?\n- How are you?\n- Hello\n- Howdy\n- Ola';

  write(_path2.default.join(botPath, _path2.default.sep, 'package.json'), JSON.stringify(pkg, null, 2));
  write(_path2.default.join(botPath, _path2.default.sep, 'chat', _path2.default.sep, 'main.ss'), firstRule);
});