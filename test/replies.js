/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should/as-function';
import helpers from './helpers';

describe.skip('SuperScript Replies', () => {
  before(helpers.before('replies'));

  describe.skip('replies random', () => {
    it('should exaused replies randomly', (done) => {
      helpers.getBot().reply('test random', (err, reply) => {
        console.log(reply);
        done();
      });
    });
  });


  describe('replies ordered', () => {
    it('should exaused replies orderedly', (done) => {
      helpers.getBot().reply('ux', 'test ordered', (err, reply) => {
        should(reply.string).eql('reply one');
        console.log(reply);
        done();

        // helpers.getBot().reply('ux','test ordered', (err, reply) => {
        //   reply.string.should.eql('reply two');
        //   console.log(reply);
        //   helpers.getBot().reply('ux','test ordered', (err, reply) => {
        //     reply.string.should.eql('reply three');
        //     console.log(reply);
        //     helpers.getBot().reply('ux','test ordered', (err, reply) => {
        //       reply.string.should.eql('');
        //       done();
        //     });
        //   });
        // });
      });
    });
  });

  after(helpers.after);
});
