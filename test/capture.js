/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should/as-function';
import helpers from './helpers';

// The bulk of these tests now live in ss-parser - that script manages the
// input capture interface.

describe('SuperScript Capture System', () => {
  before(helpers.before('capture'));

  describe('Previous Capture should return previous capture tag', () => {
    it('Previous capture', (done) => {
      helpers.getBot().reply('user1', 'previous capture one interface', (err, reply) => {
        should(reply.string).eql('previous capture test one interface');
        helpers.getBot().reply('user1', 'previous capture two', (err, reply) => {
          should(reply.string).eql('previous capture test two interface');
          done();
        });
      });
    });
  });

  describe('Match <input>', () => {
    it('It should capture the last thing said', (done) => {
      helpers.getBot().reply('user1', 'capture input', (err, reply) => {
        should(reply.string).eql('capture input');
        done();
      });
    });
  });

  after(helpers.after);
});
