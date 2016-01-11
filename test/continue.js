var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");


describe('Super Script Continue System aka Conversation', function(){

  before(help.before("continue"));

  describe.only('Dynamic Conversations', function() {
    it("set some conversation state", function(done) {
      bot.reply("user1", "__start__", function(err, reply) {
        reply.string.should.eql("match here");

        done();
        // bot.getUser("user1", function(err, user) {
        //   user.conversationState.id.should.eql(123);
        //   done();
        // });
      });
    });
  });

  describe('Match and continue', function(){
    it("should continue", function(done) {
      bot.reply("user1", "i went to highschool", function(err, reply) {
        reply.string.should.eql("did you finish ?");
        bot.reply("user1", "then what happened?", function(err, reply2) {
          ["i went to university", "what was it like?"].should.containEql(reply2.string);
          done();
        });
      });
    });

    it("should continue 2 - yes", function(done) {
      bot.reply("user1", "i like to travel", function(err, reply) {
        reply.string.should.eql("have you been to Madird?");
        bot.reply("user1", "yes it is the capital of spain!", function(err, reply2) {
          reply2.string.should.eql("Madird is amazing.");
          done();
        });
      });
    });
    
    it("should continue 3 - no", function(done) {
      bot.reply("user1", "i like to travel", function(err, reply) {
        reply.string.should.eql("have you been to Madird?");
        bot.reply("user1", "never", function(err, reply2) {
          reply2.string.should.eql("Madird is my favorite city.");
          done();
        });
      });
    });

    // These two are testing sorted gambits in replies.
    it("should continue Sorted - A", function(done) {
      bot.reply("user1", "something random", function(err, reply) {
        bot.reply("user1", "red", function(err, reply2) {
          reply2.string.should.eql("red is mine too.");
          done();
        });
      });
    });

    it("should continue Sorted - B", function(done) {
      bot.reply("user1", "something random", function(err, reply) {
        bot.reply("user1", "blue", function(err, reply2) {
          reply2.string.should.eql("I hate that color.");
          done();
        });
      });
    });

    it("GH-84 - compound reply convo.", function(done) {
      bot.reply("user1", "test complex", function(err, reply) {
        reply.string.should.eql("reply test super compound");
        bot.reply("user1", "cool", function(err, reply) {
          reply.string.should.eql("it works");
          done();
        });
      });
    });
  });

  describe("GH-133", function() {
    it("Threaded Conversation", function(done) {
      bot.reply("user1", "conversation", function(err, reply) {
        reply.string.should.eql("Are you happy?");
        
        // This is the reply to the conversation
        bot.reply("user1", "yes", function(err, reply) {
          reply.string.should.eql("OK, so you are happy");

          // Something else wont match because we are still in the conversation
          bot.reply("user1", "something else", function(err, reply) {
            reply.string.should.eql("OK, so you don't know");
            done();
          });
        });
      });
    });

    // NB: I changed the user to user2 here to clear the thread.
    // GH-162
    it.skip("Threaded Conversation 2", function(done) {
      bot.reply("user2", "start", function(err, reply) {
        reply.string.should.eql("What is your name?");

        bot.reply("user2", "My name is Marius Ursache", function(err, reply) {
          reply.string.should.eql("So your first name is Marius?");

          bot.reply("user2", "Yes", function(err, reply) {
            reply.string.should.eql("That's a nice name.");

            // We are still stuck in the conversation here, so we repeat the question again
            bot.reply("user2", "something else", function(err, reply) {
              reply.string.should.eql("okay nevermind");
              done();
            });
          });
        });
      });
    });
  });


  describe('GH-152 - dont match sub-reply', function() {
    it("Should not match", function(done) {

      bot.reply("user3", "lastreply two", function (err, reply) {
        reply.string.should.eql("");
        done();
      });
    });

  });

  describe('Match and continue KEEP', function() {

    it("Should be even more awesome", function(done){

      bot.reply("user3", "new conversation", function (err, reply) {
        reply.string.should.eql("What is your name?");

        bot.reply("user3", "My name is Rob", function (err, reply) {
          reply.string.should.eql("So your first name is Rob?");

          bot.reply("user3", "yes", function (err, reply) {
            reply.string.should.eql("Okay good.");

            bot.reply("user3", "break out", function (err, reply) {
              reply.string.should.eql("okay nevermind");

              bot.reply("user3", "break out", function (err, reply) {
                reply.string.should.eql("okay we are free");
                done();
              });
            });
          });
        });
      });
    });
  });

  describe("GH-207 Pass stars forward", function() {
    it("should pass stars forward", function(done) {
      bot.reply("user4", "start 2 foo or win", function(err, reply) {
        reply.string.should.eql("reply 2 foo");

        bot.reply("user4", "second match bar", function(err, reply) {
          reply.string.should.eql("reply 3 bar foo win");
          done();
        });

      });
    });
  });

  after(help.after);
});
