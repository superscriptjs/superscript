/* global describe, it, before, after */

import should from 'should';
import regexes from '../src/bot/regexes';

describe('The shared regular expressions', () => {
  it('redirect should match mustachioed reply names', () => {
    const m = regexes.redirect.match('{@__greeting__} How are you today?');
    m[1].should.equal('__greeting__');
    m.index.should.equal(0);
  });

  it('redirect should not match mustachioed bare words', () => {
    const m = regexes.redirect.match('{keep} Hi, good to see you!');
    should.not.exist(m);
  });

  it('topic should match “^topicRedirect” expressions', () => {
    const m = regexes.topic.match('hello ^topicRedirect(topicName,trigger) ');
    // const m = 'hello ^topicRedirect(topicName,trigger) '.match(regexes.topic)
    m[1].should.equal('topicName');
    m[2].should.equal('trigger');
    m.index.should.equal(6);
  });

  it('respond should match “^respond(topicName)” expressions', () => {
    const m = regexes.respond.match('hello ^respond(topicName) ');
    m[1].should.equal('topicName');
    m.index.should.equal(6);
  });

  it('customFn should match “^functionName(arg1,<cap>)” expressions', () => {
    const m = regexes.customFn.match('the weather is ^getWeather(today,<cap>) today');
    m[1].should.equal('getWeather');
    m[2].should.equal('today,<cap>');
    m.index.should.equal(15);
  });

  it('wordnet should match “I ~like ~sport” expressions', () => {
    const m = regexes.wordnet.match('I ~like ~sport');
    m.should.deepEqual(['~like', '~sport']);
  });

  it('state should match “{keep} some {state}” expressions', () => {
    const m = regexes.state.match('{keep} some {state}');
    m.should.deepEqual(['{keep}', '{state}']);
  });

  it('filters should match “hello ^filterName(foo,<bar>, baz) !” expressions', () => {
    const m = regexes.filter.match('hello ^filterName(foo,<bar>, baz) !');
    m.length.should.equal(3);
    m[1].should.equal('filterName');
    m[2].should.equal('foo,<bar>, baz');
    m.index.should.equal(6);
  });

  it('delay should match “this {delay = 400}” expressions', () => {
    regexes.delay.match('this {delay = 400}')[1].should.equal('400');
    regexes.delay.match('{delay=300} testing')[1].should.equal('300');
    regexes.delay.match('{ delay =300} test')[1].should.equal('300');
    regexes.delay.match('{ delay =300 } test')[1].should.equal('300');
  });
});
