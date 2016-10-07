/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should';
import helpers from './helpers';

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
        ['we like it', 'i hate it'].should.containEql(reply.string);
        done();
      });
    });

    it('Should break in function with third param', (done) => {
      helpers.getBot().reply('userx', 'force break', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });

    it('Should continue in function with third param', (done) => {
      helpers.getBot().reply('userx', 'force continue', (err, reply) => {
        reply.string.should.eql('force one force two');
        done();
      });
    });

    it('Should continue with a {CONTINUE} tag', (done) => {
      helpers.getBot().reply('userx', 'break with continue', (err, reply) => {
        reply.string.should.eql('ended test passed');
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
            g.doesMatch(msg, options, (e, r) => {
              r.should.exist;
              done();
            });
          });
        });
      });
    });

    it('update gambit test', (done) => {
      helpers.getBot().chatSystem.Gambit.findOrCreate({ input: 'this is a create test' }, (er, gam) => {
        gam.save(() => {
          helpers.getBot().message('this is a create test', (err, msg) => {
            helpers.getBot().getUser('user1', (err, user) => {
              const options = { user };
              gam.doesMatch(msg, options, (e, r) => {
                r.should.exist;
                gam.input = 'this is a create *~2';
                gam.save(() => {
                  helpers.getBot().message('this is a create hello world', (err, msg) => {
                    gam.doesMatch(msg, options, (e, r) => {
                      r[1].should.eql('hello world');
                      done();
                    });
                  });
                });
              });
            });
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
        helpers.getBot().chatSystem.Topic.findOne({ name: 'outdoors' }, (e, topic) => {
          const options = {};
          helpers.getBot().getUser('user1', (err, user) => {
            options.user = user;
            topic.doesMatch(msg, options, (e, r) => {
              r.should.not.be.empty;
              r[0].input.should.containEql('I like to *');
              done();
            });
          });
        });
      });
    });
  });

  describe('TopicDiscovery', () => {
    it('Should find the right topic', (done) => {
      helpers.getBot().reply('i like to hunt', (err, reply) => {
        reply.string.should.containEql('i like to spend time outdoors');

        helpers.getBot().reply('i like to fish', (err, reply) => {
          reply.string.should.containEql('me too');
          done();
        });
      });
    });
  });


  // it("Post Order Topics", function(done){
  //   helpers.getBot().reply("I like to spend time fishing", function(err, reply){
  //     console.log(reply);
  //     reply.string.should.containEql("fishing");
  //     done();
  //   });
  // });


  describe.skip('log-debug', () => {
    it('Should show steps - redirect', (done) => {
      helpers.getBot().reply('user', 'generic redirect', (err, reply) => {
        reply.debug.matched_gambit[0].topic.should.containEql('random');
        reply.debug.matched_gambit[0].subset[0].topic.should.containEql('test');
        done();
      });
    });

    it('Should show steps - respond', (done) => {
      helpers.getBot().reply('user', 'generic respond', (err, reply) => {
        reply.debug.matched_gambit[0].topic.should.containEql('random');
        reply.debug.matched_gambit[0].subset[0].topic.should.containEql('test');
        done();
      });
    });
  });


  describe('gh-240', () => {
    it('should stop with topicRedirect', (done) => {
      helpers.getBot().reply('user', 'test empty', (err, reply) => {
        reply.string.should.containEql('');
        done();
      });
    });

    it('should stop with respond', (done) => {
      helpers.getBot().reply('user', 'test respond', (err, reply) => {
        reply.string.should.containEql('');
        done();
      });
    });
  });

  after(helpers.after);
});
