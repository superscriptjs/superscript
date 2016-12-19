/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should/as-function';
import helpers from './helpers';
import async from 'async';

describe('SuperScript Replies', () => {
  before(helpers.before('replies'));


  let itor = function(user) {
    return function(msg, next) {
      helpers.getBot().reply(user, msg, (err, reply) => {
        next(err, reply.string);
      });
    };
  }

  describe('replies exhaust', () => {
    describe('random', () => {
      it('should exhaused replies randomly', (done) => {
        var data = (new Array(3)).fill('test exhaust random');
        async.mapSeries(data, itor('us2'), (err, replies1) => {
          async.mapSeries(data, itor('us3'), (err, replies2) => {
            should.notDeepEqual(replies1, replies2);
            done();
          });
        });
      });
    });

    describe('ordered', () => {
      it('should exaused replies orderedly', (done) => {
        var data = (new Array(4)).fill('test exhaust ordered');
        async.mapSeries(data, itor('us4'), (err, replies1) => {
          should(replies1).deepEqual(['reply one', 'reply two', 'reply three', '']);
          done();
        });
      });
    });
  });


  describe('replies keep', () => {
    describe('random', () => {
      it('should keep replies randomly', (done) => {
        var data = (new Array(3)).fill('test keep random');
        async.mapSeries(data, itor('us2'), (err, replies1) => {
          async.mapSeries(data, itor('us3'), (err, replies2) => {
            should.notDeepEqual(replies1, replies2);
            done();
          });
        });
      });
    });

    describe('ordered', () => {
      it('should keep replies orderedly', (done) => {
        var data = (new Array(4)).fill('test keep ordered');
        async.mapSeries(data, itor('us4'), (err, replies1) => {
          should(replies1).deepEqual(['reply one', 'reply one', 'reply one', 'reply one']);
          done();
        });
      });
    });
  });

  describe.skip('replies reload', () => {
    describe('random', () => {
      it('should reload replies randomly', (done) => {
        var data = (new Array(4)).fill('test reload random');
        async.mapSeries(data, itor('us5'), (err, replies1) => {
          async.mapSeries(data, itor('us6'), (err, replies2) => {
            console.log(replies1, replies1)
            should.notDeepEqual(replies1, replies2);
            should.notEqual(replies1[3], '');
            should.notEqual(replies2[3], '');
            done();
          });
        });
      });
    });

    describe('ordered', () => {
      it('should reload replies orderedly', (done) => {
        var data = (new Array(4)).fill('test reload ordered');
        async.mapSeries(data, itor('us4'), (err, replies1) => {
          should(replies1).deepEqual(['reply one', 'reply one', 'reply one', 'reply one']);
          done();
        });
      });
    });
  });
  after(helpers.after);
});
