'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _re = require('re2');

var _re2 = _interopRequireDefault(_re);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Standard regular expressions that can be reused throughout the codebase
// Also, easier to test now that they are all in one place
// Of course this should all probably be replaced with a real parser ...

// TODO: topic, customFn, and filter could all parse out the parameters instead of returning them as a single string

exports.default = {
  redirect: new _re2.default('\\{@(.+?)\\}'),
  topic: new _re2.default('\\^topicRedirect\\(\\s*([~\\w<>\\s]*),([~\\w<>\\s]*)\\s*\\)'),
  respond: new _re2.default('\\^respond\\(\\s*([\\w~]*)\\s*\\)'),

  customFn: new _re2.default('\\^(\\w+)\\(([\\w<>%,\\s\\-&()"\';:$]*)\\)'),
  wordnet: new _re2.default('(~)(\\w[\\w]+)', 'g'),
  state: new _re2.default('{([^}]*)}', 'g'),

  filter: new _re2.default('\\^(\\w+)\\(([\\w<>,\\s]*)\\)', 'i'),

  delay: new _re2.default('{\\s*delay\\s*=\\s*(\\d+)\\s*}'),

  clear: new _re2.default('{\\s*clear\\s*}', 'i'),
  continue: new _re2.default('{\\s*continue\\s*}', 'i'),
  end: new _re2.default('{\\s*end\\s*}', 'i'),

  capture: new _re2.default('<cap(\\d{0,2})>', 'i'),
  captures: new _re2.default('<cap(\\d{0,2})>', 'ig'),
  pcapture: new _re2.default('<p(\\d{1,2})cap(\\d{1,2})>', 'i'),
  pcaptures: new _re2.default('<p(\\d{1,2})cap(\\d{1,2})>', 'ig'),

  comma: new _re2.default(','),
  commas: new _re2.default(',', 'g'),

  space: {
    inner: new _re2.default('[ \\t]+', 'g'),
    leading: new _re2.default('^[ \\t]+'),
    trailing: new _re2.default('[ \\t]+$'),
    oneInner: new _re2.default('[ \\t]', 'g'),
    oneLeading: new _re2.default('^[ \\t]'),
    oneTrailing: new _re2.default('[ \\t]$')
  },

  whitespace: {
    both: new _re2.default('(?:^\\s+)|(?:\\s+$)', 'g'),
    leading: new _re2.default('^\s+'),
    trailing: new _re2.default('\s+$'),
    oneLeading: new _re2.default('^\s'),
    oneTrailing: new _re2.default('\s$')
  }
};