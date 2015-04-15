var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe.only('Super Script Continue System', function(){

  before(help.before("continue"));

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

  after(help.after);
});