/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should/as-function';
import helpers from './helpers';

describe('SuperScript substitution Interface', () => {
  before(helpers.before('substitution'));

  describe('Message Subs', () => {
    it('name subsitution', (done) => {
      helpers.getBot().reply('user1', 'Ashley is here', (err, reply) => {
        should(reply.string).eql('hi Ashley');
        done();
      });
    });

    it('name subsitution - 2', (done) => {
      helpers.getBot().reply('user1', 'Ashley is taller than Heather', (err, reply) => {
        should(reply.string).eql('Heather is shorter than Ashley');
        done();
      });
    });

    it('name subsitution - 3', (done) => {
      helpers.getBot().reply('user1', 'John Ellis is taller than Heather Allen', (err, reply) => {
        should(reply.string).eql('Heather Allen is shorter than John Ellis');
        done();
      });
    });

    it('verb pronoun noun subsitution ', (done) => {
      helpers.getBot().reply('user1', 'She ran to Vancouver', (err, reply) => {
        should(reply.string).eql('okay');
        done();
      });
    });
  });

  after(helpers.after);
});
