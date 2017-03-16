/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should/as-function';
import helpers from './helpers';

// Testing topics that include and mixin other topics.
describe('SuperScript Topic Hooks', () => {
  before(helpers.before('topichooks'));

  describe('Pre/Post Topic Hooks', () => {
    it('pre topic should be called', (done) => {
      helpers.getBot().chatSystem.Topic.findOne({ name: '__pre__' }, (err, res) => {
        should(res.reply_exhaustion).eql('keep');
        should(res.gambits).have.length(1);
        done();
      });
    });

    it('post topic should be called', (done) => {
      helpers.getBot().chatSystem.Topic.findOne({ name: '__post__' }, (err, res) => {
        should(res.reply_exhaustion).eql('keep');
        should(res.gambits).have.length(1);
        done();
      });
    });

    it('normal topic should be called', (done) => {
      helpers.getBot().chatSystem.Topic.findOne({ name: 'random' }, (err, res) => {
        should(res.gambits).have.length(1);
        done();
      });
    });
  });

  after(helpers.after);
});
