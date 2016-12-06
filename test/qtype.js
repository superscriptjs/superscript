/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should';
import helpers from './helpers';

describe('SuperScript QType Matching', () => {
  before(helpers.before('qtype'));

  describe('Simple Question Matching', () => {
    it('should reply to simple string', (done) => {
      helpers.getBot().reply('user1', 'which way to the bathroom?', (err, reply) => {
        reply.string.should.eql('Down the hall on the left');
        done();
      });
    });

    it('should not match', (done) => {
      helpers.getBot().reply('user1', 'My mom cleans the bathroom.', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });
  });

  after(helpers.after);
});
