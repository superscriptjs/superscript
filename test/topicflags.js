/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should/as-function';
import helpers from './helpers';

describe('SuperScript Topics', () => {
  before(helpers.before('topicflags'));

  describe('Topic Functions', () => {
    // The length of this should equal five (at present): this excludes system topics which
    // are not searched by default, and includes the random topic (it always does).
    it('should fetch a list of topics', (done) => {
      helpers.getBot().findOrCreateUser('user1', (err, user) => {
        const message = { lemString: 'hello world' };

        helpers.getBot().chatSystem.Topic.findPendingTopicsForUser(user, message, (e, topics) => {
          should(topics).not.be.empty;
          should(topics).have.length(6);
          done();
        });
      });
    });

    it('find topic by Name', (done) => {
      helpers.getBot().chatSystem.Topic.findByName('random', (err, topic) => {
        should(topic).not.be.empty;
        done();
      });
    });
  });

  describe('Topics - System', () => {
    it('topic should have system flag', (done) => {
      helpers.getBot().reply('user1', 'this is a system topic', (err, reply) => {
        should(reply.string).be.empty;
        done();
      });
    });

    // Re-check this
    it('Go to hidden topic indirectly', (done) => {
      helpers.getBot().reply('user1', 'why did you run', (err, reply) => {
        // This really just makes sure the reply is not accesses directly
        should(reply.string).eql('to get away from someone');
        should(reply.topicName).eql('system_why');
        done();
      });
    });

    it('topic recurrsion with respond', (done) => {
      helpers.getBot().reply('user1', 'test recursion', (err, reply) => {
        should(reply.string).eql('');
        done();
      });
    });
  });

  describe('Topic - sort', () => {
    it('topic should not be orderd by default', (done) => {
      helpers.getBot().reply('user1', 'this must catch some', (err, reply) => {
        helpers.getBot().chatSystem.Topic.findByName('random', (err, topic) => {
          topic.createGambit({ input: 'this must catch some more' }, (er, gam) => {
            gam.addReply({ reply: 'New Reply' }, (err, rep) => {
              topic.sortGambits(() => {
                helpers.getBot().reply('user1', 'this must catch some more', (err, reply) => {
                  should(reply.string).eql('New Reply');
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
        should(reply.string).eql('final');
        done();
      });
    });

    it('topic flow 1', (done) => {
      helpers.getBot().reply('user 10', 'testing hidden', (err, reply) => {
        should(reply.string).eql('some reply');

        helpers.getBot().reply('user 10', 'yes', (err, reply) => {
          should(reply.string).eql('this must work.');
          done();
        });
      });
    });

    it('topic flow 2', (done) => {
      helpers.getBot().reply('user2', 'testing hidden', (err, reply) => {
        should(reply.string).eql('some reply');

        helpers.getBot().reply('user2', 'lets not go on', (err, reply) => {
          should(reply.string).eql('end');
          done();
        });
      });
    });
  });

  describe('Topics - NoStay Flag', () => {
    it('topic should have keep flag', (done) => {
      helpers.getBot().reply('User1', 'testing nostay', (err, reply) => {
        should(reply.string).eql('topic test pass');
        helpers.getBot().reply('User1', 'something else', (err, reply) => {
          should(reply.string).eql('reply in random');
          done();
        });
      });
    });
  });

  describe('Topics - Keep', () => {
    it('topic should have keep flag', (done) => {
      helpers.getBot().chatSystem.Topic.findByName('keeptopic', (err, t) => {
        should(t.keep).be.true;
        done();
      });
    });

    it('should keep topic for reuse', (done) => {
      helpers.getBot().reply('user1', 'set topic to keeptopic', (err, reply) => {
        should(reply.string).eql('Okay we are going to keeptopic');

        helpers.getBot().getUser('user1', (err, cu) => {
          should(cu.getTopic()).eql('keeptopic');
          helpers.getBot().reply('user1', 'i have 1 thing to say', (err, reply) => {
            should(reply.string).eql('topic test pass');
            helpers.getBot().reply('user1', 'i have 1 thing to say', (err, reply) => {
              should(reply.string).eql('topic test pass');
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
            should(ct).eql('dry');

            helpers.getBot().reply('user1', 'this is a dry topic', (err, reply) => {
              should(reply.string).eql('dry topic test pass');
              // Say it again...
              helpers.getBot().reply('user1', 'this is a dry topic', (err, reply) => {
                // If something was said, we don't say it again
                should(reply.string).eql('');
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('gh-230', () => {
    it('nostay should not discard responses', (done) => {
      helpers.getBot().reply('user2', 'test no stay', (err, reply) => {
        should(reply.string).eql("Mustn't stay here.");
        done();
      });
    });
  });

  after(helpers.after);
});
