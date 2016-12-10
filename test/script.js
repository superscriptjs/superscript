/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should';
import async from 'async';

import helpers from './helpers';
import Utils from '../src/bot/utils';

// TODO re-test "okay my name is X" should match "my name is X"

describe('SuperScript Scripting + Style Interface', () => {
  before(helpers.before('script'));

  describe('Replies can be repeated accross triggers', () => {
    it('Replies accross trigger should pass', (done) => {
      helpers.getBot().reply('user1', 'trigger 1', (err, reply) => {
        reply.string.should.eql('generic reply');
        helpers.getBot().reply('user1', 'trigger 2', (err, reply) => {
          reply.string.should.eql('generic reply');
          done();
        });
      });
    });

    // We exausted this reply in the last test.
    // NB: this test will fail if run on its own.
    it('Should pass 2', (done) => {
      helpers.getBot().reply('user1', 'trigger one', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });
  });

  describe('Expand with WordNet', () => {
    it('should reply to simple string', (done) => {
      helpers.getBot().reply('user1', 'I love shoes', (err, reply) => {
        reply.string.should.eql('Wordnet test one');
        done();
      });
    });

    it('should not expand user-defined concepts greedly (word boundry protection)', (done) => {
      helpers.getBot().reply('user1', 'I love ballball', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });

    // This works, but I dont like having to import the DB every time
    it.skip('should expand user-defined concepts too', (done) => {
      helpers.getBot().reply('user1', 'I love basketball', (err, reply) => {
        reply.string.should.eql('Term expanded');
        done();
      });
    });

    // To match lemma version of wordnet expanded terms, make sure the whole line is lemmed.
    it.skip('should match both text and lemma', (done) => {
      helpers.getBot().reply('user1', 'My brother is fat', (err, reply) => {
        reply.string.should.eql('Ouch');
        helpers.getBot().reply('user1', 'My brothers is fat', (err, reply) => {
          reply.string.should.eql('Ouch');
          done();
        });
      });
    });
  });

  describe('Replies can have Optionals too!', () => {
    it('replies with optionals', (done) => {
      helpers.getBot().reply('user1', 'this reply is random', (err, reply) => {
        ['yes this reply is awesome', 'yes this reply is random'].should.containEql(reply.string);
        done();
      });
    });

    it('replies with wordnet', (done) => {
      helpers.getBot().reply('user1', 'reply with wordnet', (err, reply) => {
        ['i cotton people', 'i prefer people', 'i care for people', 'i love people', 'i please people'].should.containEql(reply.string);
        done();
      });
    });
  });

  describe('Sub-Replies', () => {
    it('Sub replies 1', (done) => {
      helpers.getBot().reply('user1', 'redirect_rainbow', (err, reply) => {
        const r = { string: 'red',
          topicName: 'rainbow',
          subReplies:
          [{ delay: '500', string: 'orange' },
             { delay: '500', string: 'yellow' },
             { delay: '500', string: 'green' },
             { delay: '500', string: 'blue' },
             { delay: '500', string: 'and black?' }] };

        reply.should.containDeep(r);
        done();
      });
    });

    it('Sub replies 2', (done) => {
      helpers.getBot().reply('user1', 'how many colors in the rainbow', (err, reply) => {
        const r = { string: '',
          topicName: 'rainbow',
          subReplies:
           [{ delay: '500', string: 'lots' }] };

        reply.should.containDeep(r);
        done();
      });
    });
  });

  describe('Custom functions', () => {
    it('should call a custom function with hyphen', (done) => {
      helpers.getBot().reply('user1', 'error with function thirty-two', (err, reply) => {
        reply.string.should.eql('32');
        done();
      });
    });

    it('should call a custom function', (done) => {
      helpers.getBot().reply('user1', 'custom function', (err, reply) => {
        reply.string.should.eql('The Definition of function is perform duties attached to a particular office or place or function');
        done();
      });
    });

    it('should continue if error is passed into callback', (done) => {
      helpers.getBot().reply('user1', 'custom 3 function', (err, reply) => {
        reply.string.should.eql('backup plan');
        done();
      });
    });

    it('pass a param into custom function', (done) => {
      helpers.getBot().reply('user1', 'custom 5 function', (err, reply) => {
        reply.string.should.eql('he likes this');
        done();
      });
    });

    it('pass a param into custom function1', (done) => {
      helpers.getBot().reply('user1', 'custom 6 function', (err, reply) => {
        ['he cottons this', 'he prefers this', 'he cares for this', 'he loves this', 'he pleases this'].should.containEql(reply.string);
        done();
      });
    });

    it('the same function twice with different params', (done) => {
      helpers.getBot().reply('user1', 'custom 8 function', (err, reply) => {
        reply.string.should.eql('4 + 3 = 7');
        done();
      });
    });

    it('should not freak out if function does not exist', (done) => {
      helpers.getBot().reply('user1', 'custom 4 function', (err, reply) => {
        reply.string.should.eql('one + one = 2');
        done();
      });
    });

    it('function in multi-line reply', (done) => {
      helpers.getBot().reply('user1', 'custom 9 function', (err, reply) => {
        reply.string.should.eql('a\nb\none\n\nmore');
        done();
      });
    });
  });

  // I moved this to 5 times because there was a odd chance that we could hit the keep message 2/3rds of the time
  describe('Reply Flags', () => {
    it('Keep Flag 2', (done) => {
      helpers.getBot().reply('user1', 'reply flags 2', (err, reply) => {
        reply.string.should.eql('keep this');
        helpers.getBot().reply('user1', 'reply flags 2', (err, reply) => {
          reply.string.should.eql('keep this');
          done();
        });
      });
    });
  });

  describe('Custom functions 3 - user fact system', () => {
    it('Should save and recall 1', (done) => {
      helpers.getBot().reply('userX', 'save name Bob', (err, reply) => {
        reply.string.should.eql('Hi Bob.');
        helpers.getBot().getUser('userX', (err, u1) => {
          u1.getVar('name', (err, name) => {
            name.should.eql('Bob');
            done();
          });
        });
      });
    });

    it('Should save and recall 2', (done) => {
      helpers.getBot().reply('suser2', 'save name Ken', (err, reply) => {
        reply.string.should.eql('Hi Ken.');
        helpers.getBot().getUser('userX', (err, u1) => {
          helpers.getBot().getUser('suser2', (err, u2) => {
            u1.getVar('name', (err, res) => {
              res.should.eql('Bob');
              u2.getVar('name', (err, res) => {
                res.should.eql('Ken');
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('Custom functions 4 - user topic change', () => {
    it('Change topic', (done) => {
      helpers.getBot().reply('user3', 'call function with new topic', (err, reply) => {
        helpers.getBot().reply('user3', 'i like fish', (err, reply) => {
          reply.string.should.eql('me too');
          done();
        });
      });
    });

    // This will require processing function tags before any other reply tags
    it.skip('Change topic 2', (done) => {
      helpers.getBot().reply('user4', 'reply with a new topic from function', (err, reply) => {
        helpers.getBot().getUser('user4', (err, user) => {
          user.currentTopic.should.eql('fish');
          helpers.getBot().reply('user4', 'i like fish', (err, reply) => {
            reply.string.should.eql('me too');
            done();
          });
        });
      });
    });
  });

  describe('Filter functions', () => {
    it('Trigger function', (done) => {
      helpers.getBot().reply('scuser5', 'trigger filter function', (err, reply) => {
        reply.string.should.eql('');
        helpers.getBot().reply('scuser5', 'trigger filler function', (err, reply) => {
          reply.string.should.eql('trigger filter reply');
          done();
        });
      });
    });
  });

  describe('Should parse subfolder', () => {
    it('Item in folder should exist', (done) => {
      helpers.getBot().chatSystem.Topic.findOne({ name: 'suba' }, (e, res) => {
        res.should.not.be.false;
        done();
      });
    });
  });

  describe('Filter on Replies', () => {
    it('should save knowledge', (done) => {
      helpers.getBot().reply('r1user1', 'my name is Adam.', (err, reply) => {
        reply.string.should.containEql('Nice to meet you, Adam.');

        // The Reply HAS a filter
        helpers.getBot().chatSystem.Reply.findOne({ _id: reply.replyId }, (e, res) => {
          res.filter.should.containEql('^hasName("false")');

          // The user added the fact to the local sublevel
          helpers.getBot().getUser('r1user1', (err, user) => {
            user.memory.db.get({ subject: 'name', predicate: 'r1user1' }, (err, results) => {
              results[0].object.should.containEql('Adam');

              // Now lets hit the other reply / filter
              helpers.getBot().reply('r1user1', 'my name is Adam.', (err, reply1) => {
                reply1.string.should.containEql('I know, you already told me your name.');
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('Augment reply Object', () => {
    it('Should have replyProp', (done) => {
      helpers.getBot().reply('user1', 'Can you smile?', (err, reply) => {
        reply.string.should.eql('Sure can.');
        reply.emoji.should.eql('smile');
        done();
      });
    });

    it('Augment callback 1', (done) => {
      helpers.getBot().reply('user1', 'object param one', (err, reply) => {
        reply.string.should.eql('world');
        reply.attachments.should.eql([{ text: 'Optional text that appears *within* the attachment' }]);
        done();
      });
    });

    it('Augment callback 2', (done) => {
      helpers.getBot().reply('user1', 'object param 2', (err, reply) => {
        reply.string.should.eql('world');
        reply.foo.should.eql('bar');
        done();
      });
    });

    // Params though redirects & Merge
    it('Augment callback 3', (done) => {
      helpers.getBot().reply('user1', 'object param 3', (err, reply) => {
        reply.string.should.eql('world');
        reply.foo.should.eql('bar');
        reply.attachments.should.eql([{ text: 'Optional text that appears *within* the attachment' }]);
        done();
      });
    });
  });

  describe('Wrapping lines', () => {
    it('should continue onto the next line', (done) => {
      helpers.getBot().reply('user1', 'tell me a poem', (err, reply) => {
        reply.string.should.eql('Little Miss Muffit sat on her tuffet,\nIn a nonchalant sort of way.\nWith her forcefield around her,\nThe Spider, the bounder,\nIs not in the picture today.');
        done();
      });
    });
  });

  describe('Normalize Trigger', () => {
    it('should be expanded before trying to match', (done) => {
      helpers.getBot().reply('user1', 'it is all good in the hood', (err, reply) => {
        reply.string.should.eql('normalize trigger test');
        done();
      });
    });

    it('should be expanded before trying to match contract form', (done) => {
      helpers.getBot().reply('user1', "it's all good in the hood two", (err, reply) => {
        reply.string.should.eql('normalize trigger test');
        done();
      });
    });

    it('message should exist after normalize', (done) => {
      helpers.getBot().reply('user1', 'then', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });
  });

  describe('Mix case test', () => {
    it('should match all capitals', (done) => {
      helpers.getBot().reply('user1', 'this is all capitals', (err, reply) => {
        reply.string.should.eql('Test six must pass');
        done();
      });
    });

    it('should match some capitals', (done) => {
      helpers.getBot().reply('user1', 'this IS ALL capitals', (err, reply) => {
        reply.string.should.eql('Test six must pass');
        done();
      });
    });

    it('should match with or without puct - 1', (done) => {
      helpers.getBot().reply('user1', 'Do you have a clue?', (err, reply) => {
        reply.string.should.eql('Test seven must pass');
        done();
      });
    });

    it('should match with or without puct - 2', (done) => {
      helpers.getBot().reply('user1', 'Do you have a cause', (err, reply) => {
        reply.string.should.eql('Test seven must pass');
        done();
      });
    });

    it('should match with extra spaces mixed in', (done) => {
      helpers.getBot().reply('user1', 'Do       you       have   a    condition', (err, reply) => {
        reply.string.should.eql('Test seven must pass');
        done();
      });
    });

    it('should allow spaces at the end of replies', (done) => {
      helpers.getBot().reply('user1', 'spaced out', (err, reply) => {
        reply.string.should.eql('note the space  ');
        done();
      });
    });
  });

  describe('Style - burst related', () => {
    it('should removed bursted commas', (done) => {
      helpers.getBot().reply('user1', 'John is older than Mary, and Mary is older than Sarah', (err, reply) => {
        reply.string.should.eql('Test eight must pass');
        done();
      });
    });

    it('should removed bursted commas 2', (done) => {
      helpers.getBot().reply('user1', 'Is it morning, noon, night?', (err, reply) => {
        reply.string.should.eql('Test nine must pass');
        done();
      });
    });

    it('should removed quotes', (done) => {
      helpers.getBot().reply('user1', 'remove quotes around "car"?', (err, reply) => {
        reply.string.should.eql('Test ten must pass');
        done();
      });
    });

    it('should keep reply quotes', (done) => {
      helpers.getBot().reply('user1', 'reply quotes', (err, reply) => {
        reply.string.should.eql('Test "eleven" must pass');
        done();
      });
    });
  });

  describe('Keep the current topic when a special topic is matched', () => {
    it('Should redirect to the first gambit', (done) => {
      helpers.getBot().reply('user1', 'flow match', (err, reply) => {
        reply.string.should.eql('You are in the first reply.');

        helpers.getBot().reply('user1', 'next flow match', (err, reply) => {
          reply.string.should.eql('You are in the second reply. You are in the first reply.');
          done();
        });
      });
    });

    it('Should redirect to the first gambit after matching __pre__', (done) => {
      helpers.getBot().reply('user1', 'flow match', (err, reply) => {
        reply.string.should.eql('You are in the first reply.');

        helpers.getBot().reply('user1', 'flow redirection test', (err, reply) => {
          reply.string.should.eql('Going back. You are in the first reply.');
          done();
        });
      });
    });
  });

  describe('gh-173', () => {
    it('should keep topic though sequence', (done) => {
      helpers.getBot().reply('user1', 'name', (err, reply) => {
        reply.string.should.eql('What is your first name?');
        reply.topicName.should.eql('set_name');

        helpers.getBot().reply('user1', 'Bob', (err, reply) => {
          reply.topicName.should.eql('set_name');
          reply.string.should.eql('Ok Bob, what is your last name?');

          helpers.getBot().reply('user1', 'Hope', (err, reply) => {
            // this is where we FOUND the reply
            reply.topicName.should.eql('set_name');
            // the new topic (pending topic should now be random)
            helpers.getBot().getUser('user1', (err, user) => {
              user.getTopic().should.eql('random');
              done();
            });
          });
        });
      });
    });
  });

  describe('scope creep!', () => {
    it('pass scope into redirect', (done) => {
      helpers.getBot().reply('user1', 'scope though redirect', (err, reply) => {
        reply.string.should.eql('A user1 __B__');
        done();
      }, {
        key: 'A',
      });
    });

    it('dont leak scope', (done) => {
      async.parallel([
        function (callback) {
          helpers.getBot().reply('userA', 'generic message', (err, reply) => {
            callback(null, reply.string);
          }, {
            key: 'A',
          });
        },
        function (callback) {
          helpers.getBot().reply('userB', 'generic message two', (err, reply) => {
            callback(null, reply.string);
          }, {
            key: 'B',
          });
        },
      ],
      // optional callback
      (err, results) => {
        results.should.containEql('generic reply A userA generic message');
        results.should.containEql('generic reply B userB generic message 2');

        done();
      });
    });
  });

  describe('Direct Reply', () => {
    it('should return reply', (done) => {
      helpers.getBot().directReply('user1', 'generic', '__simple__', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });
  });

  describe('GH-243', () => {
    it('Should pass data back into filter function on input', (done) => {
      helpers.getBot().reply('user2', 'filter by logic', (err, reply) => {
        reply.string.should.eql('logic');
        done();
      });
    });

    it('Should pass data back into filter function on input 2', (done) => {
      helpers.getBot().reply('user2', 'filter by ai', (err, reply) => {
        reply.string.should.eql('ai');
        done();
      });
    });
  });

  describe('GH-301: addMessageProp should work through redirects', () => {
    it('Should return multiple props', (done) => {
      helpers.getBot().reply('user2', '__preview', (err, reply) => {
        should.exist(reply.topLevelProp);
        should.exist(reply.subProp);
        done();
      });
    });
  });

  describe('custom functions should work with objects and arrays as parameters', () => {
    it('Should understand objects and arrays as parameters', (done) => {
      helpers.getBot().reply('user2', "let's test objects/arrays as custom function args", (err, reply) => {
        reply.string.should.eql("here's my answer value hey!");
        done();
      });
    });
  });

  describe('custom functions that return more tags should process them', () => {
    it('Should process result of custom function', (done) => {
      helpers.getBot().reply('user2', "what if there's more tags in custom func", (err, reply) => {
        reply.string.should.eql('and the result is yay');
        done();
      });
    });
  });

  describe('should use custom tags', () => {
    it('should respond to different version of saying hello', (done) => {
      helpers.getBot().reply('user3', 'hi', (err, reply) => {
        reply.string.should.eql('Greetings!');
        done();
      });
    });
  });

  describe('gh-265', () => {
    it('variable length issue simple case', (done) => {
      helpers.getBot().reply('user5', 'i go by bus', (err, reply) => {
        reply.string.should.eql('so you go by bus');
        done();
      });
    });

    it('variable length issue fail case', (done) => {
      helpers.getBot().reply('user5', 'i go by something else', (err, reply) => {
        reply.string.should.eql('so you go by something else');
        done();
      });
    });
  });

  after(helpers.after);
});
