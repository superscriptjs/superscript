/* global describe, it, before, after */

import should from 'should/as-function';
import regexes from '../src/bot/regexes';

describe('The shared regular expressions', () => {
  it('filters should match “hello ^filterName(foo,<bar>, baz) !” expressions', () => {
    const m = 'hello ^filterName(foo,<bar>, baz) !'.match(regexes.filter);
    should(m.length).equal(3);
    should(m[1]).equal('filterName');
    should(m[2]).equal('foo,<bar>, baz');
    should(m.index).equal(6);
  });

  it('delay should match “this {delay = 400}” expressions', () => {
    should('this {delay = 400}'.match(regexes.delay)[1]).equal('400');
    should('{delay=300} testing'.match(regexes.delay)[1]).equal('300');
    should('{ delay =300} test'.match(regexes.delay)[1]).equal('300');
    should('{ delay =300 } test'.match(regexes.delay)[1]).equal('300');
  });
});
