/* global describe, it, before, after */

import should from 'should';
import regexes from '../src/bot/regexes';

describe('The shared regular expressions', () => {
  it('filters should match “hello ^filterName(foo,<bar>, baz) !” expressions', () => {
    const m = 'hello ^filterName(foo,<bar>, baz) !'.match(regexes.filter);
    m.length.should.equal(3);
    m[1].should.equal('filterName');
    m[2].should.equal('foo,<bar>, baz');
    m.index.should.equal(6);
  });

  it('delay should match “this {delay = 400}” expressions', () => {
    'this {delay = 400}'.match(regexes.delay)[1].should.equal('400');
    '{delay=300} testing'.match(regexes.delay)[1].should.equal('300');
    '{ delay =300} test'.match(regexes.delay)[1].should.equal('300');
    '{ delay =300 } test'.match(regexes.delay)[1].should.equal('300');
  });
});
