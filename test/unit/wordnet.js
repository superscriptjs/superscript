import mocha from 'mocha';
import should from 'should/as-function';

import wordnet from '../../src/bot/reply/wordnet';

describe('Wordnet Interface', () => {
  it('should have have lookup and explore function', (done) => {
    should(wordnet.lookup).be.a.Function;
    should(wordnet.explore).be.a.Function;
    done();
  });

  it('should perform lookup correctly', (done) => {
    wordnet.lookup('like', '@', (err, results) => {
      should(err).not.exist;
      should(results).not.be.empty;
      should(results).have.length(3);
      done();
    });
  });

  it('should perform lookup correctly', (done) => {
    wordnet.lookup('like~v', '@', (err, results) => {
      should(err).not.exist;
      should(results).not.be.empty;
      should(results).have.length(2);
      done();
    });
  });

  it('should refine to POS', (done) => {
    wordnet.lookup('milk', '~', (err, results) => {
      should(err).not.exist;
      should(results).not.be.empty;
      should(results).have.length(25);
      done();
    });
  });

  it('should explore a concept', (done) => {
    wordnet.explore('job', (err, results) => {
      console.log(results);
      done();
    });
  });
});
