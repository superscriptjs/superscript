/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should/as-function';
import helpers from './helpers';

describe('SuperScript Continue System aka Conversation', () => {
  before(helpers.before('continue'));

  describe('Dynamic Conversations', () => {
    it('set some conversation state', (done) => {
      helpers.getBot().reply('user1', '__start__', (err, reply) => {
        helpers.getBot().getUser('user1', (err, user) => {
          should(reply.string).eql('match here');
          should(user.conversationState.id).eql(123);
          helpers.getBot().reply('user1', 'I really hope this works!', (err, reply) => {
            should(reply.string).eql('winning');
            done();
          });
        });
      });
    });

    it('and again', (done) => {
      helpers.getBot().reply('user1', '__start__', (err, reply) => {
        helpers.getBot().reply('user1', 'boo ya', (err, reply) => {
          helpers.getBot().getUser('user1', (err, user) => {
            should(reply.string).eql('YES');
            done();
          });
        });
      });
    });
  });

  describe('Match and continue', () => {
    it('should continue', (done) => {
      helpers.getBot().reply('user1', 'i went to highschool', (err, reply) => {
        should(reply.string).eql('did you finish ?');
        helpers.getBot().reply('user1', 'then what happened?', (err, reply2) => {
          should(['i went to university', 'what was it like?']).containEql(reply2.string);
          done();
        });
      });
    });

    // Issue in ss-message/bot-lang removing leading yes
    it('should continue 2 - yes', (done) => {
      helpers.getBot().reply('user1', 'i like to travel', (err, reply) => {
        should(reply.string).eql('have you been to Madird?');
        helpers.getBot().reply('user1', 'yes it is the capital of spain!', (err, reply2) => {
          should(reply2.string).eql('Madird is amazing.');
          done();
        });
      });
    });

    it('should continue 3 - no', (done) => {
      helpers.getBot().reply('user1', 'i like to travel', (err, reply) => {
        should(reply.string).eql('have you been to Madird?');
        helpers.getBot().reply('user1', 'no', (err, reply2) => {
          should(reply2.string).eql('Madird is my favorite city.');
          done();
        });
      });
    });

    // These two are testing sorted gambits in replies.
    it('should continue Sorted - A', (done) => {
      helpers.getBot().reply('user1', 'something random', (err, reply) => {
        helpers.getBot().reply('user1', 'red', (err, reply2) => {
          should(reply2.string).eql('red is mine too.');
          done();
        });
      });
    });

    it('should continue Sorted - B', (done) => {
      helpers.getBot().reply('user1', 'something random', (err, reply) => {
        helpers.getBot().reply('user1', 'blue', (err, reply2) => {
          should(reply2.string).eql('I hate that color.');
          done();
        });
      });
    });

    it('GH-84 - compound reply convo.', (done) => {
      helpers.getBot().reply('user1', 'test complex', (err, reply) => {
        should(reply.string).eql('reply test super compound');
        helpers.getBot().reply('user1', 'cool', (err, reply) => {
          should(reply.string).eql('it works');
          done();
        });
      });
    });
  });

  describe('GH-133', () => {
    it('Threaded Conversation', (done) => {
      helpers.getBot().reply('user5', 'conversation', (err, reply) => {
        should(reply.string).eql('Are you happy?');

        // This is the reply to the conversation
        helpers.getBot().reply('user5', 'yes', (err, reply) => {
          should(reply.string).eql('OK, so you are happy');

          // Something else wont match because we are still in the conversation
          helpers.getBot().reply('user5', 'something else', (err, reply) => {
            should(reply.string).eql("OK, so you don't know");
            done();
          });
        });
      });
    });

    // NB: I changed the user to user2 here to clear the thread.
    // FIXME: GH-162
    it.skip('Threaded Conversation 2', (done) => {
      helpers.getBot().reply('user2', 'start', (err, reply) => {
        should(reply.string).eql('What is your name?');

        helpers.getBot().reply('user2', 'My name is Marius Ursache', (err, reply) => {
          should(reply.string).eql('So your first name is Marius?');

          helpers.getBot().reply('user2', 'Yes', (err, reply) => {
            should(reply.string).eql("That's a nice name.");

            // We are still stuck in the conversation here, so we repeat the question again
            helpers.getBot().reply('user2', 'something else', (err, reply) => {
              should(reply.string).eql('okay nevermind');
              done();
            });
          });
        });
      });
    });
  });


  describe('GH-152 - dont match sub-reply', () => {
    it('Should not match', (done) => {
      helpers.getBot().reply('user3', 'lastreply two', (err, reply) => {
        should(reply.string).eql('');
        done();
      });
    });
  });

  describe('Match and continue KEEP', () => {
    it('Should be even more awesome', (done) => {
      helpers.getBot().reply('user3', 'new conversation', (err, reply) => {
        should(reply.string).eql('What is your name?');

        helpers.getBot().reply('user3', 'My name is Rob', (err, reply) => {
          should(reply.string).eql('So your first name is Rob?');

          helpers.getBot().reply('user3', 'yes', (err, reply) => {
            should(reply.string).eql('Okay good.');

            helpers.getBot().reply('user3', 'break out', (err, reply) => {
              should(reply.string).eql('okay nevermind');

              // We should have exhausted "okay nevermind" and break out completely
              helpers.getBot().reply('user3', 'break out', (err, reply) => {
                should(reply.string).eql('okay we are free');
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('GH-207 Pass stars forward', () => {
    it('should pass stars forward', (done) => {
      helpers.getBot().reply('user4', 'start 2 foo or win', (err, reply) => {
        should(reply.string).eql('reply 2 foo');
        helpers.getBot().reply('user4', '2 match bar', (err, reply) => {
          should(reply.string).eql('reply 3 bar foo win');
          done();
        });
      });
    });
  });

  describe('Contrived edge case not forwarding conversation clears with redirects', () => {
    it('should forward conversation clears', (done) => {
      helpers.getBot().reply('user6', 'this is a triumph', (err, reply) => {
        should(reply.string).eql("I'm making a note here, huge success");
        helpers.getBot().reply('user6', 'wrong lyric', (err, reply) => {
          should(reply.string).eql("That's the wrong lyric, you goon The cake is a lie");
          helpers.getBot().reply('user6', 'I like cake', (err, reply) => {
            should(reply.string).eql('do you like portal');
            done();
          });
        });
      });
    });
  });

  after(helpers.after);
});
