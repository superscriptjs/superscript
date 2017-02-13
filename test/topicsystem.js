/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should/as-function';
import helpers from './helpers';
import { doesMatch, doesMatchTopic } from '../src/bot/getReply/helpers';

/*

  Proposed - New TopicSystem relationships.
  topic.createGambit(...)
  gambit.createReply(...)

*/

// Testing topics that include and mixin other topics.
describe('SuperScript TopicsSystem', () => {
  before(helpers.before('topicsystem'));

  describe('TopicSystem', () => {
    it('Should skip empty replies until it finds a match', (done) => {
      helpers.getBot().reply('testing topic system', (err, reply) => {
        should(['we like it', 'i hate it']).containEql(reply.string);
        done();
      });
    });

    it('Should break in function with third param', (done) => {
      helpers.getBot().reply('userx', 'force break', (err, reply) => {
        should(reply.string).eql('');
        done();
      });
    });

    it('Should continue in function with third param', (done) => {
      helpers.getBot().reply('userx', 'force continue', (err, reply) => {
        should(reply.string).eql('force one force two');
        done();
      });
    });

    it('Should continue with a {CONTINUE} tag', (done) => {
      helpers.getBot().reply('userx', 'break with continue', (err, reply) => {
        should(reply.string).eql('ended test passed');
        done();
      });
    });
  });


  // Test Single gambit
  describe('Test Gambit', () => {
    // this is a testing input for the editor
    // We want a string in and false or matches out
    it('Should try string agaist gambit', (done) => {
      helpers.getBot().message('i like to build fires', (err, msg) => {
        helpers.getBot().chatSystem.Gambit.findOne({ input: 'I like to *' }, (e, g) => {
          helpers.getBot().getUser('user1', (err, user) => {
            const options = { user };
            doesMatch(g, msg, options).then((r) => {
              should(r).exist;
              done();
            }).catch(err => done(err));
          });
        });
      });
    });

    it.only('update gambit test', (done) => {
      helpers.getBot().chatSystem.Gambit.create({ input: 'this is a create test' }, (er, gam) => {
        helpers.getBot().message('this is a create test', (err, msg) => {
          helpers.getBot().getUser('user1', (err, user) => {
            const options = { user };
            doesMatch(gam, msg, options).then((r) => {
              should(r).exist;
              gam.input = 'this is a create *~2';
              // Clear the normalized trigger created in the first step.
              gam.trigger = '';
              gam.save(() => {
                helpers.getBot().message('this is a create hello world', (err, msg) => {
                  doesMatch(gam, msg, options).then((r) => {
                    should(r[1]).eql('hello world');
                    done();
                  }).catch(err => done(err));
                });
              });
            }).catch(err => done(err));
          });
        });
      });
    });
  });


  // Test Entire topic for Match
  describe('Test Topic', () => {
    // this is a testing input for the editor
    // We want a string in and false or matches out
    it('Should try string agaist topic', (done) => {
      helpers.getBot().message('I like to play outside', (err, msg) => {
        helpers.getBot().getUser('user1', (err, user) => {
          const options = { user, chatSystem: helpers.getBot().chatSystem };
          doesMatchTopic('outdoors', msg, options).then((r) => {
            should(r).not.be.empty;
            should(r[0].input).containEql('I like to play outside');
            done();
          }).catch(err => done(err));
        });
      });
    });
  });

  describe('TopicDiscovery', () => {
    it('Should find the right topic', (done) => {
      helpers.getBot().reply('i like to hunt', (err, reply) => {
        should(reply.string).containEql('i like to spend time outdoors');

        helpers.getBot().reply('i like to fish', (err, reply) => {
          should(reply.string).containEql('me too');
          done();
        });
      });
    });
  });


  describe('Topic Filter Functions', () => {
    // Now lets see it it works, we call it twice and it should be filtered both times.
    it('Should filter topic', (done) => {
      helpers.getBot().reply('filter topic test', (err, reply) => {
        should(reply.string).containEql('filter pass topic2');
        helpers.getBot().reply('filter topic test', (err, reply) => {
          should(reply.string).containEql('filter pass topic2');
          done();
        });
      });
    });
  });

  describe.skip('log-debug', () => {
    it('Should show steps - redirect', (done) => {
      helpers.getBot().reply('user', 'generic redirect', (err, reply) => {
        should(reply.debug.matched_gambit[0].topic).containEql('random');
        should(reply.debug.matched_gambit[0].subset[0].topic).containEql('test');
        done();
      });
    });

    it('Should show steps - respond', (done) => {
      helpers.getBot().reply('user', 'generic respond', (err, reply) => {
        should(reply.debug.matched_gambit[0].topic).containEql('random');
        should(reply.debug.matched_gambit[0].subset[0].topic).containEql('test');
        done();
      });
    });
  });


  describe('gh-240', () => {
    it('should stop with topicRedirect', (done) => {
      helpers.getBot().reply('user', 'test empty', (err, reply) => {
        should(reply.string).containEql('');
        done();
      });
    });

    it('should stop with respond', (done) => {
      helpers.getBot().reply('user', 'test respond', (err, reply) => {
        should(reply.string).containEql('');
        done();
      });
    });
  });

  after(helpers.after);
});
