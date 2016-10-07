import mocha from 'mocha';
import should from 'should';

import wordnet from '../../src/bot/reply/wordnet';

describe('Wordnet Interface', () => {
  it('should have have lookup and explore function', (done) => {
    wordnet.lookup.should.be.Function;
    wordnet.explore.should.be.Function;
    done();
  });

  it('should perform lookup correctly', (done) => {
    wordnet.lookup('like', '@', (err, results) => {
      should.not.exist(err);
      results.should.not.be.empty;
      results.should.have.length(3);
      done();
    });
  });

  it('should perform lookup correctly', (done) => {
    wordnet.lookup('like~v', '@', (err, results) => {
      should.not.exist(err);
      results.should.not.be.empty;
      results.should.have.length(2);
      done();
    });
  });

  it('should refine to POS', (done) => {
    wordnet.lookup('milk', '~', (err, results) => {
      should.not.exist(err);
      results.should.not.be.empty;
      results.should.have.length(25);
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
