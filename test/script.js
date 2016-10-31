/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should';
import async from 'async';

import helpers from './helpers';
import Utils from '../src/bot/utils';

describe('SuperScript Scripting + Style Interface', () => {
  before(helpers.before('script'));

  describe('Simple star Interface *', () => {
    it('Unscaped', (done) => {
      helpers.getBot().reply('user1', '+ this is unscaped', (err, reply) => {
        reply.string.should.eql('This should pass');
        done();
      });
    });

    it('should reply to simple string', (done) => {
      helpers.getBot().reply('user1', 'This is a test', (err, reply) => {
        reply.string.should.eql('Test should pass one');
        done();
      });
    });

    it('should match single star', (done) => {
      helpers.getBot().reply('user1', 'Should match single star', (err, reply) => {
        ['pass 1', 'pass 2', 'pass 3'].should.containEql(reply.string);
        done();
      });
    });

    it('should allow empty star - new behaviour', (done) => {
      helpers.getBot().reply('user1', 'Should match single', (err, reply) => {
        ['pass 1', 'pass 2', 'pass 3'].should.containEql(reply.string);
        done();
      });
    });

    it('should match double star', (done) => {
      helpers.getBot().reply('user1', 'Should match single star two', (err, reply) => {
        ['pass 1', 'pass 2', 'pass 3'].should.containEql(reply.string);
        done();
      });
    });

    it('capture in reply', (done) => {
      helpers.getBot().reply('user1', 'connect the win', (err, reply) => {
        reply.string.should.eql('Test should pass');
        done();
      });
    });

    it('leading star', (done) => {
      helpers.getBot().reply('user1', 'my bone', (err, reply) => {
        reply.string.should.eql('win 1');
        done();
      });
    });

    it('trailing star', (done) => {
      helpers.getBot().reply('user1', 'bone thug', (err, reply) => {
        reply.string.should.eql('win 1');
        done();
      });
    });

    it('star star', (done) => {
      helpers.getBot().reply('user1', 'my bone thug', (err, reply) => {
        reply.string.should.eql('win 1');
        done();
      });
    });

    it('star star empty', (done) => {
      helpers.getBot().reply('user1', 'bone', (err, reply) => {
        reply.string.should.eql('win 1');
        done();
      });
    });
  });

  describe('Exact length star interface *n', () => {
    it('should match *2 star - Zero case', (done) => {
      helpers.getBot().reply('user1', 'It is hot out', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });

    it('should match *2 star - One case', (done) => {
      helpers.getBot().reply('user1', 'It is one hot out', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });

    it('should match *2 star - Two case', (done) => {
      helpers.getBot().reply('user1', 'It is one two hot out', (err, reply) => {
        reply.string.should.eql('Test three should pass');
        done();
      });
    });

    it('should match *2 star - Three case', (done) => {
      helpers.getBot().reply('user1', 'It is one two three hot out', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });

    it('should match *1 star - End case', (done) => {
      helpers.getBot().reply('user1', 'fixedwidth define love', (err, reply) => {
        reply.string.should.eql('Test endstar should pass');
        done();
      });
    });
  });


  // min max *(1-2)
  describe('Mix stars for Mix and Max', () => {
    it('min max star - Zero', (done) => {
      helpers.getBot().reply('user1', 'min max', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });

    it('min max star - one', (done) => {
      helpers.getBot().reply('user1', 'min max one', (err, reply) => {
        reply.string.should.eql('min max test');
        done();
      });
    });

    it('min max star - two', (done) => {
      helpers.getBot().reply('user1', 'min max one two', (err, reply) => {
        reply.string.should.eql('min max test');
        done();
      });
    });

    it('min max star - three', (done) => {
      helpers.getBot().reply('user1', 'min max one two three', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });

    it('min max star ~emo - gh-221', (done) => {
      helpers.getBot().reply('user1', 'hello test test', (err, reply) => {
        reply.string.should.eql('emo reply');
        done();
      });
    });


    it.skip('min max star - four', (done) => {
      helpers.getBot().reply('user1', 'test one. two. three.', (err, reply) => {
        reply.string.should.eql('test one. two. three.');
        done();
      });
    });
  });

  describe('Variable length star interface *~n', () => {
    it('should match *~2 star - End case', (done) => {
      helpers.getBot().reply('user1', 'define love', (err, reply) => {
        reply.string.should.eql('Test endstar should pass');
        done();
      });
    });

    it('should match *~2 star - Empty', (done) => {
      helpers.getBot().reply('user1', 'var length', (err, reply) => {
        ['pass 1'].should.containEql(reply.string);
        done();
      });
    });


    it('should match *~2 star - Zero Star', (done) => {
      helpers.getBot().reply('user1', 'It is hot out 2', (err, reply) => {
        ['pass 1', 'pass 2', 'pass 3'].should.containEql(reply.string);
        done();
      });
    });

    it('should match *~2 star - One Star', (done) => {
      helpers.getBot().reply('user1', 'It is a hot out 2', (err, reply) => {
        ['pass 1', 'pass 2', 'pass 3'].should.containEql(reply.string);
        done();
      });
    });

    it('should match *~2 star - Two Star', (done) => {
      helpers.getBot().reply('user1', 'It is a b hot out 2', (err, reply) => {
        ['pass 1', 'pass 2', 'pass 3'].should.containEql(reply.string);
        done();
      });
    });

    it('should match *~2 star - Three Star (fail)', (done) => {
      helpers.getBot().reply('user1', 'It is a b c d hot out2', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });

    it('should match *~2 star - Return the resuling Star', (done) => {
      helpers.getBot().reply('user1', 'It is foo bar cold out', (err, reply) => {
        reply.string.should.eql('Two star result foo bar');
        done();
      });
    });
  });

  describe('Replies can be repeated accross triggers', () => {
    it('Replies accross trigger should pass', (done) => {
      helpers.getBot().reply('user1', 'trigger one', (err, reply) => {
        reply.string.should.eql('generic reply');
        helpers.getBot().reply('user1', 'trigger two', (err, reply) => {
          reply.string.should.eql('generic reply');
          done();
        });
      });
    });

    // We exausted this reply in the last test.
    // NB: this test will fail if run on its own.
    // We lost this functionality when we started walking the tree.
    it.skip('Should pass 2', (done) => {
      helpers.getBot().reply('user1', 'trigger one', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });
  });

  describe('Alternates Interface (a|b)', () => {
    it('should match a or b - Not empty', (done) => {
      helpers.getBot().reply('user1', 'what is it', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });

    it('should match a or b - should be A', (done) => {
      helpers.getBot().reply('user1', 'what day is it', (err, reply) => {
        reply.string.should.eql('Test four should pass');
        done();
      });
    });

    it('should match a or b - should be B', (done) => {
      helpers.getBot().reply('user1', 'what week is it', (err, reply) => {
        reply.string.should.eql('Test four should pass');
        done();
      });
    });

    it('should match a or b - word boundries A', (done) => {
      helpers.getBot().reply('user1', 'what weekend is it', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });

    it('should match a or b - word boundries B', (done) => {
      helpers.getBot().reply('user1', 'this or that', (err, reply) => {
        reply.string.should.eql('alter boundry test');
        done();
      });
    });

    it('should match a or b - word boundries C', (done) => {
      helpers.getBot().reply('user1', 'favorite', (err, reply) => {
        reply.string.should.eql('');
        done();
      });
    });

    it('should match a or b - word boundries D', (done) => {
      helpers.getBot().reply('user1', 'this a should e', (err, reply) => {
        reply.string.should.eql('alter boundry test 2');
        done();
      });
    });
  });

  describe('Optionals Interface [a|b|c]', () => {
    it('should match empty case', (done) => {
      helpers.getBot().reply('user1', 'i have a car', (err, reply) => {
        reply.string.should.eql('Test five should pass');
        done();
      });
    });

    it('should match a', (done) => {
      helpers.getBot().reply('user1', 'i have a red car', (err, reply) => {
        reply.string.should.eql('Test five should pass');
        done();
      });
    });

    it('should match b', (done) => {
      helpers.getBot().reply('user1', 'i have a blue car', (err, reply) => {
        reply.string.should.eql('Test five should pass');
        done();
      });
    });

    it('should match c', (done) => {
      helpers.getBot().reply('user1', 'i have a green car', (err, reply) => {
        reply.string.should.eql('Test five should pass');
        done();
      });
    });

    it('should not match d', (done) => {
      helpers.getBot().reply('user1', 'i have a black car', (err, reply) => {
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
        reply.string.should.eql('thirty-two');
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
      helpers.getBot().reply('user1', 'custom4 function', (err, reply) => {
        reply.string.should.eql('one + one = 2');
        done();
      });
    });

    it('function in multi-line reply', (done) => {
      helpers.getBot().reply('user1', 'custom9 function', (err, reply) => {
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

  describe('Custom functions 2 - plugin related', () => {
    it('Alpha Length 1', (done) => {
      helpers.getBot().reply('user1', 'How many characters in the word socks?', (err, reply) => {
        reply.string.should.eql('5');
        done();
      });
    });

    it('Alpha Length 2', (done) => {
      helpers.getBot().reply('user1', 'How many characters in the name Bill?', (err, reply) => {
        reply.string.should.eql('4');
        done();
      });
    });

    it('Alpha Length 3', (done) => {
      helpers.getBot().reply('user1', 'How many characters in the Alphabet?', (err, reply) => {
        reply.string.should.eql('26');
        done();
      });
    });

    it('Alpha Length 4', (done) => {
      helpers.getBot().reply('suser1', 'blank', (err, reply) => {
        helpers.getBot().getUser('suser1', (err, u) => {
          u.setVar('name', 'Bill', () => {
            helpers.getBot().reply('suser1', 'How many characters in my name?', (err, reply) => {
              reply.string.should.eql('There are 4 letters in your name.');
              done();
            });
          });
        });
      });
    });

    it('Alpha Lookup 1', (done) => {
      helpers.getBot().reply('user1', 'What letter comes after B', (err, reply) => {
        reply.string.should.eql('C');
        done();
      });
    });

    it('Alpha Lookup 2', (done) => {
      helpers.getBot().reply('user1', 'What letter comes before Z', (err, reply) => {
        reply.string.should.eql('Y');
        done();
      });
    });

    it('Alpha Lookup 3', (done) => {
      helpers.getBot().reply('user1', 'What is the last letter in the alphabet?', (err, reply) => {
        reply.string.should.eql('It is Z.');
        done();
      });
    });

    it('Alpha Lookup 4', (done) => {
      helpers.getBot().reply('user1', 'What is the first letter of the alphabet?', (err, reply) => {
        reply.string.should.eql('It is A.');
        done();
      });
    });
  });

  describe('Custom functions 3 - user fact system', () => {
    it('Should save and recall 1', (done) => {
      helpers.getBot().reply('userX', 'My name is Bob', (err, reply) => {
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
      helpers.getBot().reply('suser2', 'My name is Ken', (err, reply) => {
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

  describe.skip('Custom functions 4 - user topic change', () => {
    it('Change topic', (done) => {
      helpers.getBot().reply('user3', 'call function with new topic', (err, reply) => {
        helpers.getBot().reply('user3', 'i like fish', (err, reply) => {
          reply.string.should.eql('me too');
          done();
        });
      });
    });

    it('Change topic 2', (done) => {
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

  describe('Emo reply', () => {
    it('Emo Hello 1', (done) => {
      helpers.getBot().reply('user1', 'Hello', (err, reply) => {
        reply.string.should.eql('Hello');
        done();
      });
    });
  });

  describe('Filter on Replies', () => {
    it('should save knowledge', (done) => {
      helpers.getBot().reply('r1user1', 'okay my name is Adam.', (err, reply) => {
        reply.string.should.containEql('Nice to meet you, Adam.');
        helpers.getBot().reply('r1user1', 'okay my name is Adam.', (err, reply1) => {
          reply1.string.should.containEql('I know, you already told me your name.');
          done();
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
      helpers.getBot().reply('user1', 'object param two', (err, reply) => {
        reply.string.should.eql('world');
        reply.foo.should.eql('bar');
        done();
      });
    });

    // Params though redirects & Merge
    it('Augment callback 3', (done) => {
      helpers.getBot().reply('user1', 'object param three', (err, reply) => {
        reply.string.should.eql('world');
        reply.foo.should.eql('bar');
        reply.attachments.should.eql([{ text: 'Optional text that appears *within* the attachment' }]);
        done();
      });
    });
  });

  describe('Create Gambit Helper', () => {
    it('contains concept', (done) => {
      helpers.getBot().reply('user1', 'my husband likes fish', (err, reply) => {
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
        reply.string.should.eql('Test six should pass');
        done();
      });
    });

    it('should match some capitals', (done) => {
      helpers.getBot().reply('user1', 'this IS ALL capitals', (err, reply) => {
        reply.string.should.eql('Test six should pass');
        done();
      });
    });

    it('should match with or without puct - 1', (done) => {
      helpers.getBot().reply('user1', 'Do you have a clue?', (err, reply) => {
        reply.string.should.eql('Test seven should pass');
        done();
      });
    });

    it('should match with or without puct - 2', (done) => {
      helpers.getBot().reply('user1', 'Do you have a cause', (err, reply) => {
        reply.string.should.eql('Test seven should pass');
        done();
      });
    });

    it('should match with extra spaces mixed in', (done) => {
      helpers.getBot().reply('user1', 'Do       you       have   a    condition', (err, reply) => {
        reply.string.should.eql('Test seven should pass');
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
        reply.string.should.eql('Test eight should pass');
        done();
      });
    });

    it('should removed bursted commas 2', (done) => {
      helpers.getBot().reply('user1', 'Is it morning, noon, night?', (err, reply) => {
        reply.string.should.eql('Test nine should pass');
        done();
      });
    });

    it('should removed quotes', (done) => {
      helpers.getBot().reply('user1', 'remove quotes around "car"?', (err, reply) => {
        reply.string.should.eql('Test ten should pass');
        done();
      });
    });

    it('should keep reply quotes', (done) => {
      helpers.getBot().reply('user1', 'reply quotes', (err, reply) => {
        reply.string.should.eql('Test "eleven" should pass');
        done();
      });
    });

    it('dont burst urls', (done) => {
      Utils.sentenceSplit('should not burst http://google.com').should.have.length(1);
      Utils.sentenceSplit('should not burst 19bdnznUXdHEOlp0Pnp9JY0rug6VuA2R3zK4AACdFzhE').should.have.length(1);
      Utils.sentenceSplit('burst test should pass rob@silentrob.me').should.have.length(1);
      done();
    });
  });

  describe('Keep the current topic when a special topic is matched', () => {
    it('Should redirect to the first gambit', (done) => {
      helpers.getBot().reply('user1', 'first flow match', (err, reply) => {
        reply.string.should.eql('You are in the first reply.');

        helpers.getBot().reply('user1', 'second flow match', (err, reply) => {
          reply.string.should.eql('You are in the second reply. You are in the first reply.');
          done();
        });
      });
    });

    it('Should redirect to the first gambit after matching __pre__', (done) => {
      helpers.getBot().reply('user1', 'first flow match', (err, reply) => {
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
        results.should.containEql('generic reply B userB generic message two');

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


  describe.skip('GH-243', () => {
    it('Should pass data back into filter function on input', (done) => {
      helpers.getBot().reply('user1', 'filter by logic', (err, reply) => {
        reply.string.should.eql('logic');
        done();
      });
    });

    it('Should pass data back into filter function on input 2', (done) => {
      helpers.getBot().reply('user1', 'filter by ai', (err, reply) => {
        reply.string.should.eql('ai');
        done();
      });
    });
  });


  after(helpers.after);
});
