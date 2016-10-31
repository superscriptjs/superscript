/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should';
import helpers from './helpers';

describe('SuperScript Conversation', () => {
  before(helpers.before('convo'));

  describe('Volley', () => {
    it('should have volley', (done) => {
      helpers.getBot().reply('user1', 'Can you skip rope?', (err, reply) => {
        helpers.getBot().getUser('user1', (e, user) => {
          user.volley.should.eql(0);
          done();
        });
      });
    });

    it('should have volley 1', (done) => {
      helpers.getBot().reply('user1', 'Can you jump rope?', (err, reply) => {
        helpers.getBot().getUser('user1', (e, user) => {
          user.volley.should.eql(1);
          user.rally.should.eql(1);

          helpers.getBot().reply('user1', 'Have you done it lately?', (err, reply) => {
            helpers.getBot().getUser('user1', (e, user) => {
              user.volley.should.eql(0);
              user.rally.should.eql(0);
              done();
            });
          });
        });
      });
    });
  });

  after(helpers.after);
});
