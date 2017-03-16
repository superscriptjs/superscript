/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should/as-function';
import async from 'async';
import helpers from './helpers';

describe('SuperScript User Persist', () => {
  before(helpers.before('user'));

  describe('Get a list of users', () => {
    it('should return all users', (done) => {
      helpers.getBot().reply('userx', 'hello world', (err, reply) => {
        helpers.getBot().getUsers((err, list) => {
          should(list).not.be.empty;
          should(list[0].id).eql('userx');
          done();
        });
      });
    });
  });

  describe('Should save users session', () => {
    it('should save user session', (done) => {
      helpers.getBot().reply('iuser3', 'Save user token ABCD.', (err, reply) => {
        should(reply.string).eql('User token ABCD has been saved.');
        done();
      });
    });

    it('it remember my name', (done) => {
      // Call startup again (same as before hook)
      helpers.getBot().reply('iuser3', 'Get user token', (err, reply) => {
        should(reply.string).eql('Return ABCD');
        done();
      });
    });
  });


  describe("Don't leak the user", () => {
    const list = ['userA', 'userB'];

    it('ask user A', (done) => {
      const itor = function (user, next) {
        helpers.getBot().reply(user, 'this is a test', (err, reply) => {
          should(reply.string).eql(`this is user ${user}`);
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
