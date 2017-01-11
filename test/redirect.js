/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should/as-function';
import helpers from './helpers';

describe('SuperScript Redirects', () => {
  before(helpers.before('redirect'));

  describe('Dont trim whitespace from redirect (GH-92)', () => {
    it('this needs to work..', (done) => {
      helpers.getBot().reply('user1', 'GitHub issue 92', (err, reply) => {
        should(reply.string).eql('testing redirects one thing two thing');
        done();
      });
    });
  });

  describe('Redirect Interface', () => {
    it('should redirect on match', (done) => {
      helpers.getBot().reply('user1', 'testing redirects', (err, reply) => {
        should(reply.string).eql('redirect test pass');
        done();
      });
    });
  });

  describe('Inline Redirect Interface', () => {
    it('should redirect on match', (done) => {
      helpers.getBot().reply('user1', 'this is an inline redirect', (err, reply) => {
        should(reply.string).eql('lets redirect to redirect test pass');
        done();
      });
    });
  });

  describe('Inline Redirect two message in one reply', () => {
    it('should redirect on match complex message', (done) => {
      helpers.getBot().reply('user1', 'this is an complex redirect', (err, reply) => {
        should(reply.string).eql('this game is made up of bar teams');
        done();
      });
    });
  });

  describe('Inline Redirect Interface nested inline redirects', () => {
    it('should redirect on match complex nested message', (done) => {
      helpers.getBot().reply('user1', 'this is an nested redirect', (err, reply) => {
        should(reply.string).eql('this message contains secrets');
        done();
      });
    });
  });

  describe('Inline Redirect recurrsion!', () => {
    it('should redirect should save itself', (done) => {
      helpers.getBot().reply('user1', 'this is a bad idea', (err, reply) => {
        should(reply.string).not.be.empty;
        done();
      });
    });
  });

  describe('Inline Redirect with function GH-81', () => {
    it('should parse function and redirect', (done) => {
      helpers.getBot().reply('user1', 'tell me a random fact', (err, reply) => {
        should(reply.string).not.be.empty;
        should(reply.string).containEql("Okay, here's a fact: one . Would you like me to tell you another fact?");
        done();
      });
    });

    it('should parse function and redirect', (done) => {
      helpers.getBot().reply('user1', 'tell me a random fact 2', (err, reply) => {
        should(reply.string).not.be.empty;
        should(reply.string).containEql("Okay, here's a fact. one Would you like me to tell you another fact?");
        done();
      });
    });
  });

  describe('Redirect to new topic', () => {
    // GH-156
    it("if redirect does not exist - don't crash", (done) => {
      helpers.getBot().reply('user1', 'test missing topic', (err, reply) => {
        should(reply.string).eql('Test OK.');
        done();
      });
    });

    // GH-227
    it('Missing function', (done) => {
      helpers.getBot().reply('user1', 'issue 227', (err, reply) => {
        should(reply.string).eql('oneIs it hot');
        done();
      });
    });

    it('should redirect to new topic', (done) => {
      helpers.getBot().reply('user1', 'hello', (err, reply) => {
        should(reply.string).eql('Is it hot');
        done();
      });
    });

    it('should redirect to new topic dynamically', (done) => {
      helpers.getBot().reply('user1', 'i like school', (err, reply) => {
        should(reply.string).eql("I'm majoring in CS.");
        done();
      });
    });

    it('should redirect to new topic Inline', (done) => {
      helpers.getBot().reply('user1', 'topic redirect test', (err, reply) => {
        should(reply.string).eql('Say this. Say that.');
        done();
      });
    });

    xit('should redirect forward capture', (done) => {
      helpers.getBot().reply('user1', 'topic redirect to fishsticks', (err, reply) => {
        should(reply.string).eql('Capture forward fishsticks');
        done();
      });
    });
  });

  describe('Set topic through plugin and match gambit in the topic in next reply', () => {
    it('should redirect to system topic', (done) => {
      helpers.getBot().reply('user1', 'topic set systest', (err, r1) => {
        should(r1.string).eql('Setting systest.');
        helpers.getBot().reply('user1', 'where am I', (err, r2) => {
          should(r2.string).eql('In systest.');
          done();
        });
      });
    });
  });

  describe('GH-309: conversations should work with redirects', () => {
    it('Should be part of a conversation', (done) => {
      helpers.getBot().reply('user2', '__preview', (err, r1) => {
        should(['Do you want to play word games?', "Let's play word games"]).containEql(r1.string);
        helpers.getBot().reply('user2', 'yes', (err, r2) => {
          should(r2.string).eql("Great, let's play!");
          helpers.getBot().reply('user2', 'hello', (err, r3) => {
            should(r3.string).eql("OK, let's play!");
            done();
          });
        });
      });
    });
  });


  after(helpers.after);
});
