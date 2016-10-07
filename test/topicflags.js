/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should';
import helpers from './helpers';

// We need to revisit userConnect
describe('SuperScript Topics', () => {
  before(helpers.before('topicflags'));

  describe('Topic Functions', () => {
    // This test is failing and Im not sure if random or system topics should be included
    it.skip('should fetch a list of topics', (done) => {
      helpers.getBot().findOrCreateUser('user1', (err, user) => {
        const message = { lemString: 'hello world' };

        helpers.getBot().chatSystem.Topic.findPendingTopicsForUser(user, message, (e, topics) => {
          topics.should.not.be.empty;
          topics.should.have.length(7);
          done();
        });
      });
    });

    it('find topic by Name', (done) => {
      helpers.getBot().chatSystem.Topic.findByName('random', (err, topic) => {
        topic.should.not.be.empty;
        done();
      });
    });
  });

  describe('Topics - System', () => {
    it('topic should have system flag', (done) => {
      helpers.getBot().reply('user1', 'this is a system topic', (err, reply) => {
        reply.string.should.be.empty;
        done();
      });
    });

    // Re-check this
    it('Go to hidden topic indirectly', (done) => {
      helpers.getBot().reply('user1', 'why did you run', (err, reply) => {
        // This really just makes sure the reply is not accesses directly
        reply.string.should.eql('to get away from someone');
        reply.topicName.should.eql('system_why');
        done();
      });
    });

    it('topic recurrsion with respond', (done) => {
      helpers.getBot().reply('user1', 'test recursion', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });
  });

  describe('Topic - sort', () => {
    it('topic should not be orderd by default', (done) => {
      helpers.getBot().reply('user1', 'this should catch some', (err, reply) => {
        helpers.getBot().chatSystem.Topic.findByName('random', (err, topic) => {
          topic.createGambit({ input: 'this should catch some more' }, (er, gam) => {
            gam.addReply({ reply: 'New Reply' }, (err, rep) => {
              topic.sortGambits(() => {
                helpers.getBot().reply('user1', 'this should catch some more', (err, reply) => {
                  reply.string.should.eql('New Reply');
                  done();
                });
              });
            });
          });
        });
      });
    });
  });


  describe('Topic Flow', () => {
    it('topic flow 0', (done) => {
      helpers.getBot().reply('user1', 'respond test', (err, reply) => {
        reply.string.should.eql('final');
        done();
      });
    });

    it('topic flow 1', (done) => {
      helpers.getBot().reply('user 10', 'testing hidden', (err, reply) => {
        reply.string.should.eql('some reply');

        helpers.getBot().reply('user 10', 'yes', (err, reply) => {
          reply.string.should.eql('this should work.');
          done();
        });
      });
    });

    it('topic flow 2', (done) => {
      helpers.getBot().reply('user2', 'testing hidden', (err, reply) => {
        reply.string.should.eql('some reply');

        helpers.getBot().reply('user2', 'lets not go on', (err, reply) => {
          reply.string.should.eql('end');
          done();
        });
      });
    });
  });

  describe('Topics - NoStay Flag', () => {
    it('topic should have keep flag', (done) => {
      helpers.getBot().reply('User1', 'testing nostay', (err, reply) => {
        reply.string.should.eql('topic test pass');
        helpers.getBot().reply('User1', 'something else', (err, reply) => {
          reply.string.should.eql('reply in random');
          done();
        });
      });
    });
  });

  describe('Topics - Keep', () => {
    it('topic should have keep flag', (done) => {
      helpers.getBot().chatSystem.Topic.findByName('keeptopic', (err, t) => {
        t.keep.should.be.true;
        done();
      });
    });

    it('should keep topic for reuse', (done) => {
      helpers.getBot().reply('user1', 'set topic to keeptopic', (err, reply) => {
        reply.string.should.eql('Okay we are going to keeptopic');

        helpers.getBot().getUser('user1', (err, cu) => {
          cu.getTopic().should.eql('keeptopic');
          helpers.getBot().reply('user1', 'i have one thing to say', (err, reply) => {
            reply.string.should.eql('topic test pass');
            helpers.getBot().reply('user1', 'i have one thing to say', (err, reply) => {
              reply.string.should.eql('topic test pass');
              done();
            });
          });
        });
      });
    });


    it('should not repeat itself', (done) => {
      // Manually reset the topic
      helpers.getBot().findOrCreateUser('user1', (err, user) => {
        user.currentTopic = 'random';

        helpers.getBot().reply('user1', 'set topic to dry', (err, reply) => {
          // Now in dry topic
          helpers.getBot().getUser('user1', (err, su) => {
            const ct = su.getTopic();
            ct.should.eql('dry');

            helpers.getBot().reply('user1', 'this is a dry topic', (err, reply) => {
              reply.string.should.eql('dry topic test pass');
              // Say it again...
              helpers.getBot().reply('user1', 'this is a dry topic', (err, reply) => {
                // If something was said, we don't say it again
                reply.string.should.eql('');
                done();
              });
            });
          });
        });
      });
    });
  });

  after(helpers.after);
});
