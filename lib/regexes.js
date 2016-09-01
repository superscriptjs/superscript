const RE2 = require('re2')

// Standard regular expressions that can be reused throughout the codebase
// Also, easier to test now that they are all in one place
// Of course this should all probably be replaced with a real parser ...

// todo: topic, customFn, and filter could all parse out the parameters instead of returning them as a single string

module.exports = {

  redirect: new RE2('\\{@(.+?)\\}'),
  topic: new RE2('\\^topicRedirect\\(\\s*([~\\w<>\\s]*),([~\\w<>\\s]*)\\s*\\)'),
  respond: new RE2('\\^respond\\(\\s*([\\w~]*)\\s*\\)'),

  customFn: new RE2('\\^(\\w+)\\(([\\w<>%,\\s\\-&()"\';:$]*)\\)'),
  wordnet: new RE2('(~)(\\w[\\w]+)', 'g'),
  state: new RE2('{([^}]*)}', 'g'),

  filter: new RE2('\\^(\\w+)\\(([\\w<>,\\s]*)\\)', 'i'),

  delay: new RE2('{\\s*delay\\s*=\\s*(\\d+)\\s*}'),

  clear: new RE2('{\\s*clear\\s*}', 'i'),
  continue: new RE2('{\\s*continue\\s*}', 'i'),
  end: new RE2('{\\s*end\\s*}', 'i'),

  capture: new RE2('<cap(\\d{0,2})>', 'i'),
  captures: new RE2('<cap(\\d{0,2})>', 'ig'),
  pcapture: new RE2('<p(\\d{1,2})cap(\\d{1,2})>', 'i'),
  pcaptures: new RE2('<p(\\d{1,2})cap(\\d{1,2})>', 'ig'),

  comma: new RE2(','),
  commas: new RE2(',', 'g'),

  space: {
    inner: new RE2('[ \\t]+', 'g'),
    leading: new RE2('^[ \\t]+'),
    trailing: new RE2('[ \\t]+$'),
    oneInner: new RE2('[ \\t]', 'g'),
    oneLeading: new RE2('^[ \\t]'),
    oneTrailing: new RE2('[ \\t]$')
  },

  whitespace: {
    both: new RE2('(?:^\\s+)|(?:\\s+$)', 'g'),
    leading: new RE2('^\s+'),
    trailing: new RE2('\s+$'),
    oneLeading: new RE2('^\s'),
    oneTrailing: new RE2('\s$'),
  }

}
