/* global describe, it */

import mocha from 'mocha';
import should from 'should/as-function';

import wordnet from '../../src/bot/reply/wordnet';

describe('Wordnet Interface', () => {
  it('should have have lookup and explore function', (done) => {
    should(wordnet.lookup).be.a.Function();
    should(wordnet.explore).be.a.Function();
    done();
  });

  it('should perform lookup correctly', async () => {
    const results = await wordnet.lookup('like', '@');
    should(results).have.length(3);
  });

  it('should perform lookup correctly', async () => {
    const results = await wordnet.lookup('like~v', '@');
    should(results).have.length(2);
  });

  it('should refine to POS', async () => {
    const results = await wordnet.lookup('milk', '~');
    should(results).have.length(25);
  });

  it('should explore a concept', async () => {
    const results = wordnet.explore('job');
    console.log(results);
  });
});
