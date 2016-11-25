#!/usr/bin/env node
'use strict';

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _ssParser = require('ss-parser');

var _ssParser2 = _interopRequireDefault(_ssParser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_commander2.default.version('1.0.0').option('-p, --path [type]', 'Input path', './chat').option('-o, --output [type]', 'Output options', 'data.json').option('-f, --force [type]', 'Force save if output file already exists', false).parse(process.argv);

_fs2.default.exists(_commander2.default.output, function (exists) {
  if (!exists || _commander2.default.force) {
    // TODO: Allow use of own fact system in this script
    _ssParser2.default.loadDirectory(_commander2.default.path, function (err, result) {
      if (err) {
        console.error('Error parsing bot script: ' + err);
      }
      _fs2.default.writeFile(_commander2.default.output, JSON.stringify(result, null, 4), function (err) {
        if (err) throw err;
        console.log('Saved output to ' + _commander2.default.output);
      });
    });
  } else {
    console.log('File', _commander2.default.output, 'already exists, remove file first or use -f to force save.');
  }
});