/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should';
import helpers from './helpers';

describe('SuperScript substitution Interface', () => {
  before(helpers.before('substitution'));

  describe('Message Subs', () => {
    it('name subsitution', (done) => {
      helpers.getBot().reply('user1', 'Rob is here', (err, reply) => {
        reply.string.should.eql('hi Rob');
        done();
      });
    });

    it('name subsitution - 2', (done) => {
      helpers.getBot().reply('user1', 'Rob is taller than Heather', (err, reply) => {
        reply.string.should.eql('Heather is shorter than Rob');
        done();
      });
    });

    it('name subsitution - 3', (done) => {
      helpers.getBot().reply('user1', 'Rob Ellis is taller than Heather Allen', (err, reply) => {
        reply.string.should.eql('Heather Allen is shorter than Rob Ellis');
        done();
      });
    });

    it('name subsitution - 4', (done) => {
      helpers.getBot().reply('user1', 'Rob is taller than Rob', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });


    it('verb pronoun noun subsitution ', (done) => {
      helpers.getBot().reply('user1', 'She ran to Vancouver', (err, reply) => {
        reply.string.should.eql('okay');
        done();
      });
    });
  });

  after(helpers.after);
});
