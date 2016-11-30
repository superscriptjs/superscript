/* global describe, it, before, after */

import should from 'should/as-function';
import fs from 'fs';
import peg from 'pegjs';

const grammar = fs.readFileSync(`${__dirname}/../src/bot/reply/reply-grammar.pegjs`, 'utf-8');
const parser = peg.generate(grammar, { trace: false });

const matchTags = function matchTags(reply, expectedTags) {
  const tags = parser.parse(reply);
  should(tags).deepEqual(expectedTags);
};

// TODO: Test captures like <cap1>, <p1cap2> etc

describe('Test if the reply tags PEG parser works', () => {
  it('match redirects', () => {
    const reply = '{@__greeting__} How are you today?';
    const expectedTags = [
      {
        type: 'redirect',
        trigger: '__greeting__',
      },
      ' How are you today?',
    ];
    matchTags(reply, expectedTags);
  });

  it('match topicRedirects', () => {
    const reply = 'hello ^topicRedirect("topicName","trigger") ';
    const expectedTags = [
      'hello ',
      {
        type: 'topicRedirect',
        functionArgs: '["topicName","trigger"]',
      },
      ' ',
    ];
    matchTags(reply, expectedTags);
  });

  it('match responds', () => {
    const reply = 'hello ^respond("topicName") ';
    const expectedTags = [
      'hello ',
      {
        type: 'respond',
        functionArgs: '["topicName"]',
      },
      ' ',
    ];
    matchTags(reply, expectedTags);
  });

  it('match custom functions', () => {
    const reply = 'the weather is ^getWeather("today","<cap>") today';
    const expectedTags = [
      'the weather is ',
      {
        type: 'customFunction',
        functionName: 'getWeather',
        functionArgs: '["today","<cap>"]',
      },
      ' today',
    ];
    matchTags(reply, expectedTags);
  });

  it('match wordnet expressions', () => {
    const reply = 'I ~like ~sport';
    const expectedTags = [
      'I ',
      {
        type: 'wordnetLookup',
        term: 'like',
      },
      ' ',
      {
        type: 'wordnetLookup',
        term: 'sport',
      },
    ];
    matchTags(reply, expectedTags);
  });

  it('match clear', () => {
    const reply = '{clear } clear me';
    const expectedTags = [
      {
        type: 'clearConversation',
      },
      ' clear me',
    ];
    matchTags(reply, expectedTags);
  });

  it('match continue', () => {
    const reply = 'you should check more {CONTINUE}';
    const expectedTags = [
      'you should check more ',
      {
        type: 'continueSearching',
      },
    ];
    matchTags(reply, expectedTags);
  });

  it('match end', () => {
    const reply = 'STOP searching { end }';
    const expectedTags = [
      'STOP searching ',
      {
        type: 'endSearching',
      },
    ];
    matchTags(reply, expectedTags);
  });
});
