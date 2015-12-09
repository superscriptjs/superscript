var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");
var async = require("async");
var Utils = require("../lib/utils");

describe.only('SuperScript Scripting + Style Interface', function(){
  before(help.before("script"));

  describe('Simple star Interface *', function(){

    it("Unscaped", function(done) {
      bot.reply("user1", "+ this is unscaped", function(err, reply) {
        reply.string.should.eql("This should pass");
        done();
      });
    });

    it("should reply to simple string", function(done) {
      bot.reply("user1", "This is a test", function(err, reply) {
        reply.string.should.eql("Test should pass one");
        done();
      });
    });

    it("should match single star", function(done) {
      bot.reply("user1", "Should match single star", function(err, reply) {
        ["pass 1", "pass 2", "pass 3"].should.containEql(reply.string);
        done();
      });
    });

    it("should allow empty star - new behaviour", function(done) {
      bot.reply("user1", "Should match single", function(err, reply) {
        ["pass 1", "pass 2", "pass 3"].should.containEql(reply.string);
        done();
      });
    });

    it("should match double star", function(done) {
      bot.reply("user1", "Should match single star two", function(err, reply) {
        ["pass 1", "pass 2", "pass 3"].should.containEql(reply.string);
        done();
      });
    });

    it("capture in reply", function(done) {
      bot.reply("user1", "connect the win", function(err, reply) {
        reply.string.should.eql("Test should pass");
        done();
      });
    });

    it("leading star", function(done) {
      bot.reply("user1", "my bone", function(err, reply) {
        reply.string.should.eql("win 1");
        done();
      });
    });

    it("trailing star", function(done) {
      bot.reply("user1", "bone thug", function(err, reply) {
        reply.string.should.eql("win 1");
        done();
      });
    });

    it("star star", function(done) {
      bot.reply("user1", "my bone thug", function(err, reply) {
        reply.string.should.eql("win 1");
        done();
      });
    });

    it("star star empty", function(done) {
      bot.reply("user1", "bone", function(err, reply) {
        reply.string.should.eql("win 1");
        done();
      });
    });

  });

  describe('Exact length star interface *n', function(){
    it("should match *2 star - Zero case", function(done) {
      bot.reply("user1", "It is hot out", function(err, reply) {
        reply.string.should.eql("");
        done();
      });
    });

    it("should match *2 star - One case", function(done) {
      bot.reply("user1", "It is one hot out", function(err, reply) {
        reply.string.should.eql("");
        done();
      });
    });

    it("should match *2 star - Two case", function(done) {
      bot.reply("user1", "It is one two hot out", function(err, reply) {
        reply.string.should.eql("Test three should pass");
        done();
      });
    });

    it("should match *2 star - Three case", function(done) {
      bot.reply("user1", "It is one two three hot out", function(err, reply) {
        reply.string.should.eql("");
        done();
      });
    });

    it("should match *1 star - End case", function(done) {
      bot.reply("user1", "fixedwidth define love", function(err, reply) {
        reply.string.should.eql("Test endstar should pass");
        done();
      });
    });
  });


  // min max *(1-2)
  describe('Mix stars for Mix and Max', function(){
    it("min max star - Zero", function(done) {
      bot.reply("user1", "min max", function(err, reply) {
        reply.string.should.eql("");
        done();
      });
    });

    it("min max star - one", function(done) {
      bot.reply("user1", "min max one", function(err, reply) {
        reply.string.should.eql("min max test");
        done();
      });
    });

    it("min max star - two", function(done) {
      bot.reply("user1", "min max one two", function(err, reply) {
        reply.string.should.eql("min max test");
        done();
      });
    });

    it("min max star - three", function(done) {
      bot.reply("user1", "min max one two three", function(err, reply) {
        reply.string.should.eql("");
        done();
      });
    });

    // Todo implement this
    // it("min max star - four", function(done) {
    //   bot.reply("user1", "test 2 min max", function(err, reply) {
    //     reply.string.should.eql("min max test");
    //     done();
    //   });
    // });

  });

  describe('Variable length star interface *~n', function() {
    it("should match *~2 star - End case", function(done) {
      bot.reply("user1", "define love", function(err, reply) {
        reply.string.should.eql("Test endstar should pass");
        done();
      });
    });

    it("should match *~2 star - Empty", function(done) {
      bot.reply("user1", "var length", function(err, reply) {
        ["pass 1"].should.containEql(reply.string);
        done();
      });
    });


    it("should match *~2 star - Zero Star", function(done) {
      bot.reply("user1", "It is hot out 2", function(err, reply) {
        ["pass 1","pass 2","pass 3"].should.containEql(reply.string);
        done();
      });
    });

    it("should match *~2 star - One Star", function(done) {
      bot.reply("user1", "It is a hot out2", function(err, reply) {
        ["pass 1","pass 2","pass 3"].should.containEql(reply.string);
        done();
      });
    });

    it("should match *~2 star - Two Star", function(done) {
      bot.reply("user1", "It is a b hot out2", function(err, reply) {
        ["pass 1","pass 2","pass 3"].should.containEql(reply.string);
        done();
      });
    });

    it("should match *~2 star - Three Star (fail)", function(done) {
      bot.reply("user1", "It is a b c d hot out2", function(err, reply) {
        reply.string.should.eql("");
        done();
      });
    });

    it("should match *~2 star - Return the resuling Star", function(done) {
      bot.reply("user1", "It is foo bar cold out", function(err, reply) {
        reply.string.should.eql("Two star result foo bar");
        done();
      });
    });

  });

  describe('Replies can be repeated accross triggers', function(){
    it("Replies accross trigger should pass", function(done) {
      bot.reply("user1", "trigger one", function(err, reply) {
        reply.string.should.eql("generic reply");

        bot.reply("user1", "trigger two", function(err, reply) {
          reply.string.should.eql("generic reply");
          done();
        });
      });
    });

    // We exausted this reply in the last test.
    // NB: this test will fail if run on its own.
    it("Should pass 2", function(done) {
      bot.reply("user1", "trigger one", function(err, reply) {
        reply.string.should.eql("");
        done();
      });
    });
  });

  describe('Alternates Interface (a|b)', function() {
    it("should match a or b - Not empty", function(done) {
      bot.reply("user1", "what is it", function(err, reply) {
        reply.string.should.eql("");
        done();
      });
    });

    it("should match a or b - should be A", function(done) {
      bot.reply("user1", "what day is it", function(err, reply) {
        reply.string.should.eql("Test four should pass");
        done();
      });
    });

    it("should match a or b - should be B", function(done) {
      bot.reply("user1", "what week is it", function(err, reply) {
        reply.string.should.eql("Test four should pass");
        done();
      });
    });

    it("should match a or b - word boundries A", function(done) {
      bot.reply("user1", "what weekend is it", function(err, reply) {
        reply.string.should.eql("");
        done();
      });
    });

    it("should match a or b - word boundries B", function(done) {
      bot.reply("user1", "this or that", function(err, reply) {
        reply.string.should.eql("alter boundry test");
        done();
      });
    });

    it("should match a or b - word boundries C", function(done) {
      bot.reply("user1", "favorite", function(err, reply) {
        reply.string.should.eql("");
        done();
      });
    });

    it("should match a or b - word boundries D", function(done) {
      bot.reply("user1", "this a should e", function(err, reply) {
        reply.string.should.eql("alter boundry test 2");
        done();
      });
    });

  });

  describe('Optionals Interface [a|b|c]', function(){
    it("should match empty case", function(done) {
      bot.reply("user1", "i have a car", function(err, reply) {
        reply.string.should.eql("Test five should pass");
        done();
      });
    });

    it("should match a", function(done) {
      bot.reply("user1", "i have a red car", function(err, reply) {
        reply.string.should.eql("Test five should pass");
        done();
      });
    });

    it("should match b", function(done) {
      bot.reply("user1", "i have a blue car", function(err, reply) {
        reply.string.should.eql("Test five should pass");
        done();
      });
    });

    it("should match c", function(done) {
      bot.reply("user1", "i have a green car", function(err, reply) {
        reply.string.should.eql("Test five should pass");
        done();
      });
    });

    it("should not match d", function(done) {
      bot.reply("user1", "i have a black car", function(err, reply) {
        reply.string.should.eql("");
        done();
      });
    });
  });

  describe('Expand with WordNet', function() {
    it("should reply to simple string", function(done) {
      bot.reply("user1", "I love shoes", function(err, reply) {
        reply.string.should.eql("Wordnet test one");
        done();
      });
    });

    it("should not expand user-defined concepts greedly (word boundry protection)", function(done) {
      bot.reply("user1", "I love ballball", function(err, reply) {
        reply.string.should.eql("");
        done();
      });
    });

    // This works, but I dont like having to import the DB every time
    it.skip("should expand user-defined concepts too", function(done) {
      bot.reply("user1", "I love basketball", function(err, reply) {
        reply.string.should.eql("Term expanded");
        done();
      });
    });

    // To match lemma version of wordnet expanded terms, make sure the whole line is lemmed.
    it.skip("should match both text and lemma", function(done) {
      bot.reply("user1", "My brother is fat", function(err, reply) {
        reply.string.should.eql("Ouch");
        bot.reply("user1", "My brothers is fat", function(err, reply) {
          reply.string.should.eql("Ouch");
          done();
        });

      });
    });

  });

  describe('Replies can have Optionals too!', function(){
    it("replies with optionals", function(done) {
      bot.reply("user1", "this reply is random", function(err, reply) {
        ["yes this reply is awesome","yes this reply is random"].should.containEql(reply.string);
        done();
      });
    });

    it("replies with wordnet", function(done) {
      bot.reply("user1", "reply with wordnet", function(err, reply) {
        ["i cotton people","i prefer people", "i care for people", "i love people", "i please people"].should.containEql(reply.string);
        done();
      });
    });
  });

  describe('Sub-Replies', function(){
    it("Sub replies 1", function(done) {
      bot.reply("user1", "redirect_rainbow", function(err, reply) {

        var r = { string: 'red',
          topicName: 'rainbow',
          subReplies:
           [ { delay: '500', string: 'orange' },
             { delay: '500', string: 'yellow' },
             { delay: '500', string: 'green' },
             { delay: '500', string: 'blue' },
             { delay: '500', string: 'and black?' } ] };

        reply.should.containDeep(r);
        done();
      });
    });

    it("Sub replies 2", function(done) {
      bot.reply("user1", "how many colors in the rainbow", function(err, reply) {

        var r = { string: '',
          topicName: 'rainbow',
          subReplies:
           [ { delay: '500', string: 'lots' } ] };

        reply.should.containDeep(r);
        done();
      });
    });



  });


  describe('Custom functions', function(){
    it("should call a custom function", function(done) {
      bot.reply("user1", "custom function", function(err, reply) {
        reply.string.should.eql("The Definition of function is perform duties attached to a particular office or place or function");
        done();
      });
    });

    it("should continue if error is passed into callback", function(done) {
      bot.reply("user1", "custom 3 function", function(err, reply) {
        reply.string.should.eql("backup plan");
        done();
      });
    });

    it("pass a param into custom function", function(done) {
      bot.reply("user1", "custom 5 function", function(err, reply) {
        reply.string.should.eql("he likes this");
        done();
      });
    });

    it("pass a param into custom function1", function(done) {
      bot.reply("user1", "custom 6 function", function(err, reply) {
        ["he cottons this","he prefers this", "he cares for this", "he loves this", "he pleases this"].should.containEql(reply.string);
        done();
      });
    });

    it("the same function twice with different params", function(done) {
      bot.reply("user1", "custom 8 function", function(err, reply) {
        reply.string.should.eql("4 + 3 = 7");
        done();
      });
    });

    it("should not freak out if function does not exist", function(done) {
      bot.reply("user1", "custom4 function", function(err, reply) {
        reply.string.should.eql("one + one = 2");
        done();
      });
    });

    it("function in multi-line reply", function(done) {
      bot.reply("user1", "custom9 function", function(err, reply) {
        reply.string.should.eql("a\nb\none\n\nmore");
        done();
      });
    });

  });


  // I moved this to 5 times because there was a odd chance that we could hit the keep message 2/3rds of the time
  describe('Reply Flags', function() {

    it("Keep Flag 2", function(done) {
      bot.reply("user1", "reply flags 2", function(err, reply) {
        reply.string.should.eql("keep this");
        bot.reply("user1", "reply flags 2", function(err, reply) {
          reply.string.should.eql("keep this");
          done();
        });
      });
    });
  });

  describe('Custom functions 2 - plugin related', function(){
    it("Alpha Length 1", function(done) {
      bot.reply("user1", "How many characters in the word socks?", function(err, reply) {
        reply.string.should.eql("5");
        done();
      });
    });

    it("Alpha Length 2", function(done) {
      bot.reply("user1", "How many characters in the name Bill?", function(err, reply) {
        reply.string.should.eql("4");
        done();
      });
    });

    it("Alpha Length 3", function(done) {
      bot.reply("user1", "How many characters in the Alphabet?", function(err, reply) {
        reply.string.should.eql("26");
        done();
      });
    });

    it("Alpha Length 4", function(done) {
      bot.reply("suser1", "blank", function(err, reply) {
        bot.getUser("suser1", function(err, u){
          u.setVar("name", "Bill", function(){
            bot.reply("suser1", "How many characters in my name?", function(err, reply) {
              reply.string.should.eql("There are 4 letters in your name.");
              done();
            });
          });
        });
      });
    });

    it("Alpha Lookup 1", function(done) {
      bot.reply("user1", "What letter comes after B", function(err, reply) {
        reply.string.should.eql("C");
        done();
      });
    });

    it("Alpha Lookup 2", function(done) {
      bot.reply("user1", "What letter comes before Z", function(err, reply) {
        reply.string.should.eql("Y");
        done();
      });
    });

    it("Alpha Lookup 3", function(done) {
      bot.reply("user1", "What is the last letter in the alphabet?", function(err, reply) {
        reply.string.should.eql("It is Z.");
        done();
      });
    });

    it("Alpha Lookup 4", function(done) {
      bot.reply("user1", "What is the first letter of the alphabet?", function(err, reply) {
        reply.string.should.eql("It is A.");
        done();
      });
    });

  });

  describe('Custom functions 3 - user fact system', function(){
    it("Should save and recall 1", function(done) {
      bot.reply("userX", "My name is Bob", function(err, reply) {
        reply.string.should.eql("Hi Bob.");
        bot.getUser("userX", function(err, u1){
          u1.getVar('name', function(err, name){
            name.should.eql("Bob");
            done();
          });
        });
      });
    });

    it("Should save and recall 2", function(done) {
      bot.reply("suser2", "My name is Ken", function(err, reply) {
        reply.string.should.eql("Hi Ken.");
        bot.getUser("userX", function(err, u1){
          bot.getUser("suser2", function(err, u2){
            u1.getVar("name", function(err, res){
              res.should.eql("Bob");
              u2.getVar("name", function(err, res){
                res.should.eql("Ken");
                done();
              });
            });
          });
        });
      });
    });

  });

  describe('Custom functions 4 - user topic change', function(){
    it("Change topic", function(done) {
      bot.reply("user3", "call function with new topic", function(err, reply) {
        bot.getUser("user3", function(err, user){
          user.currentTopic.should.eql("fish");
          bot.reply("user3", "i like fish", function(err, reply) {
            reply.string.should.eql("me too");
            done();
          });
        });
      });
    });

    it("Change topic 2", function(done) {
      bot.reply("user4", "reply with a new topic from function", function(err, reply) {
        bot.getUser("user4", function(err, user){
          user.currentTopic.should.eql("fish");
          bot.reply("user4", "i like fish", function(err, reply) {
            reply.string.should.eql("me too");
            done();
          });
        });
      });
    });
  });


  describe('Filter functions', function(){
    it("Trigger function", function(done) {
      bot.reply("scuser5", "trigger filter function", function(err, reply) {
        reply.string.should.eql("");
        bot.reply("scuser5", "trigger filler function", function(err, reply) {
          reply.string.should.eql("trigger filter reply");
          done();
        });
      });
    });
  });

  describe('Should parse subfolder', function(){
    it("Item in folder should exist", function(done) {
      bot.topicSystem.topic.findOne({name:'suba'}, function(e,res){
        res.should.not.be.false;
        done();
      });
    });
  });

  describe('Emo reply', function(){
    it("Emo Hello 1", function(done) {
      bot.reply("user1", "Hello", function(err, reply) {
        reply.string.should.eql("Hello");
        done();
      });
    });
  });

  describe('Filter on Replies', function(){
    it("should save knowledge", function(done) {
      bot.reply("r1user1", "okay my name is Adam.", function(err, reply) {
        reply.string.should.containEql("Nice to meet you, Adam.");
        bot.reply("r1user1", "okay my name is Adam.", function(err, reply1) {
          reply1.string.should.containEql("I know, you already told me your name.");
          done();
        });
      });
    });
  });


  describe('Augment reply Object', function(){
    it("Should have replyProp", function(done) {
      bot.reply("user1", "Can you smile?", function(err, reply) {
        reply.string.should.eql("Sure can.");
        reply.emoji.should.eql("smile");
        done();
      });
    });

    it("Should have replyProp 2", function(done) {
      bot.reply("user1", "Property 1. Property 2.", function(err, reply) {
        reply.string.should.eql("buz baz");
        reply.p1.should.eql("foo");
        reply.p2.should.eql("bar");
        done();
      });
    });
  });

  describe('Create Gambit Helper', function(){
    it("contains concept", function(done) {
      bot.reply("user1", "my husband likes fish", function(err, reply) {
        done();
      });
    });
  });


  describe('Wrapping lines', function(){
    it("should continue onto the next line", function(done){
      bot.reply("user1", "tell me a poem", function(err, reply) {
        reply.string.should.eql("Little Miss Muffit sat on her tuffet,\nIn a nonchalant sort of way.\nWith her forcefield around her,\nThe Spider, the bounder,\nIs not in the picture today.");
        done();
      });
    });
  });

  describe('Normalize Trigger', function(){
    it("should be expanded before trying to match", function(done){
      bot.reply("user1", "it is all good in the hood", function(err, reply) {
        reply.string.should.eql("normalize trigger test");
        done();
      });
    });

    it("should be expanded before trying to match contract form", function(done){
      bot.reply("user1", "it's all good in the hood two", function(err, reply) {
        reply.string.should.eql("normalize trigger test");
        done();
      });
    });
  });

  describe('Mix case test', function(){
    it("should match all capitals", function(done){
      bot.reply("user1", "this is all capitals", function(err, reply) {
        reply.string.should.eql("Test six should pass");
        done();
      });
    });

    it("should match some capitals", function(done){
      bot.reply("user1", "this IS ALL capitals", function(err, reply) {
        reply.string.should.eql("Test six should pass");
        done();
      });
    });

    it("should match with or without puct - 1", function(done){
      bot.reply("user1", "Do you have a clue?", function(err, reply) {
        reply.string.should.eql("Test seven should pass");
        done();
      });
    });

    it("should match with or without puct - 2", function(done){
      bot.reply("user1", "Do you have a cause", function(err, reply) {
        reply.string.should.eql("Test seven should pass");
        done();
      });
    });

    it("should match with extra spaces mixed in", function(done){
      bot.reply("user1", "Do       you       have   a    condition", function(err, reply) {
        reply.string.should.eql("Test seven should pass");
        done();
      });
    });

    it("should allow spaces at the end of replies", function(done){
      bot.reply("user1", "spaced out", function(err, reply) {
        reply.string.should.eql("note the space  ");
        done();
      });
    });

  });

  describe('Style - burst related', function(){
    it("should removed bursted commas", function(done){
      bot.reply("user1", "John is older than Mary, and Mary is older than Sarah", function(err, reply) {
        reply.string.should.eql("Test eight should pass");
        done();
      });
    });

    it("should removed bursted commas 2", function(done){
      bot.reply("user1", "Is it morning, noon, night?", function(err, reply) {
        reply.string.should.eql("Test nine should pass");
        done();
      });
    });

    it("should removed quotes", function(done){
      bot.reply("user1", 'remove quotes around "car"?', function(err, reply) {
        reply.string.should.eql("Test ten should pass");
        done();
      });
    });

    it("should keep reply quotes", function(done){
      bot.reply("user1", "reply quotes", function(err, reply) {
        reply.string.should.eql('Test "eleven" should pass');
        done();
      });
    });
     
    it("dont burst urls", function(done){
      Utils.sentenceSplit("should not burst http://google.com").should.have.length(1);
      Utils.sentenceSplit("should not burst 19bdnznUXdHEOlp0Pnp9JY0rug6VuA2R3zK4AACdFzhE").should.have.length(1);
      Utils.sentenceSplit("burst test should pass rob@silentrob.me").should.have.length(1);
      done();
    });
    
  });

  describe("chunk message", function(){
    it("should split the message into two", function(done){
      bot.reply("user1", "My name is Bill. What is your name?", function(err, reply) {
        reply.string.should.eql("Hi Bill. My name is Brit.");
        done();
      });
    });
  });

  describe('Keep the current topic when a special topic is matched', function(){
    it("Should redirect to the first gambit", function(done) {
      bot.reply("user1", "first flow match", function(err, reply) {
        reply.string.should.eql("You are in the first reply.");

        bot.reply("user1", "second flow match", function(err, reply) {
          reply.string.should.eql("You are in the second reply. You are in the first reply.");
          done();
        });
      });
    });

    it("Should redirect to the first gambit after matching __pre__", function(done) {
      bot.reply("user1", "first flow match", function(err, reply) {
        reply.string.should.eql("You are in the first reply.");

        bot.reply("user1", "flow redirection test", function(err, reply) {
          reply.string.should.eql("Going back. You are in the first reply.");
          done();
        });
      });
    });
  });

  describe("gh-172", function(){
    it("should keep topic though sequence", function(done){
      bot.reply("user1", "name", function(err, reply) {
        reply.string.should.eql("What is your first name?");
        reply.topicName.should.eql("set_name");
        
        bot.reply("user1", "Bob", function(err, reply) {
          reply.topicName.should.eql("set_name");
          reply.string.should.eql("Ok Bob, what is your last name?");

          bot.reply("user1", "Hope", function(err, reply) {
            reply.topicName.should.eql("random");
            done();
          });
        });
        
      });
    });
  });

  after(help.after);

});
