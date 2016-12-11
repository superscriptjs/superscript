/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should/as-function';
import helpers from './helpers';

describe('SuperScript Multitenant', () => {
  before((done) => {
    helpers.parseAndSaveToCache('multitenant1', (err, fileCache) => {
      if (err) {
        return done(err);
      }
      return helpers.parseAndSaveToCache('multitenant2', (err2, fileCache2) => {
        if (err2) {
          return done(err2);
        }
        return helpers.setupBot(null, true, (err3) => {
          if (err3) {
            return done(err3);
          }
          return helpers.getBot().getBot('multitenant1').importFile(fileCache, (err) => {
            helpers.getBot().getBot('multitenant2').importFile(fileCache2, (err) => {
              done();
            });
          });
        });
      });
    });
  });

  describe('Different tenancy', () => {
    it('should reply to trigger in tenancy', (done) => {
      helpers.getBot().getBot('multitenant1').reply('user1', 'must reply to this', (err, reply) => {
        should(reply.string).eql('in tenancy one');
        done();
      });
    });

    it('should not reply to trigger not in tenancy', (done) => {
      helpers.getBot().getBot('multitenant1').reply('user1', 'must not reply to this', (err, reply) => {
        should(reply.string).eql('catch all');
        done();
      });
    });
  });
});
