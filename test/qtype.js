/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should';
import helpers from './helpers';

describe('SuperScript QType Matching', () => {
  before(helpers.before('qtype'));

  describe('Simple Question Matching (qSubType)', () => {
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

  describe('Advanced Question Matching (qType)', () => {
    it('should reply to QType string YN QType', (done) => {
      helpers.getBot().reply('user1', 'Do you like to clean?', (err, reply) => {
        reply.string.should.eql('a');
        done();
      });
    });

    // HUN:ind should be ordered higher up the queue.
    it('should reply to QType string B (fine grained)', (done) => {
      helpers.getBot().reply('user1', 'Who can clean the house?', (err, reply) => {
        reply.string.should.eql('a');
        done();
      });
    });

    it('should reply to QType string C', (done) => {
      helpers.getBot().reply('user1', 'How fast can you clean?', (err, reply) => {
        reply.string.should.eql('c');
        done();
      });
    });
  });

  after(helpers.after);
});
