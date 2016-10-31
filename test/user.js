/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should';
import async from 'async';
import helpers from './helpers';

describe('SuperScript User Persist', () => {
  before(helpers.before('user'));

  describe('Get a list of users', () => {
    it('should return all users', (done) => {
      helpers.getBot().reply('userx', 'hello world', (err, reply) => {
        helpers.getBot().getUsers((err, list) => {
          list.should.not.be.empty;
          list[0].id.should.eql('userx');
          done();
        });
      });
    });
  });

  describe('Should save users session', () => {
    it('should save user session', (done) => {
      helpers.getBot().reply('iuser3', 'Save user token ABCD.', (err, reply) => {
        reply.string.should.eql('User token ABCD has been saved.');
        done();
      });
    });

    it('it remember my name', (done) => {
      // Call startup again (same as before hook)
      helpers.getBot().reply('iuser3', 'Get user token', (err, reply) => {
        reply.string.should.eql('Return ABCD');
        done();
      });
    });
  });


  describe("Don't leak the user", () => {
    const list = ['userA', 'userB'];

    it('ask user A', (done) => {
      const itor = function (user, next) {
        helpers.getBot().reply(user, 'this is a test', (err, reply) => {
          reply.string.should.eql(`this is user ${user}`);
          next();
        });
      };
      async.each(list, itor, () => {
        done();
      });
    });
  });

  after(helpers.after);
});
