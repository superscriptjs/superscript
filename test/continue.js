var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe('Super Script Continue System', function(){

  before(help.before("continue"));

  describe('Match and continue', function(){

    it("should continue", function(done) {
      bot.reply("user1", "i went to highschool", function(err, reply) {
        reply.should.eql("did you finish ?");
        bot.reply("user1", "then what happened?", function(err, reply2) {
          reply2.should.eql("i went to university");
          done();
        });
      });
    });

    it("should continue 2 - yes", function(done) {
      bot.reply("user1", "i like to travel", function(err, reply) {
        reply.should.eql("have you been to Madird?");
        bot.reply("user1", "yes it is the capital of spain!", function(err, reply2) {
          reply2.should.eql("Madird is amazing.");
          done();
        });
      });
    });
    
    it("should continue 3 - no", function(done) {
      bot.reply("user1", "i like to travel", function(err, reply) {
        reply.should.eql("have you been to Madird?");
        bot.reply("user1", "never", function(err, reply2) {
          reply2.should.eql("Madird is my favorite city.");
          done();
        });
      });
    });

    it("should continue 4 - A", function(done) {
      bot.reply("user1", "something random", function(err, reply) {
        bot.reply("user1", "red", function(err, reply2) {
          reply2.should.eql("red is mine too.");
          done();
        });
      });
    });

    it("should continue 4 - B", function(done) {
      bot.reply("user1", "something random", function(err, reply) {
        bot.reply("user1", "blue", function(err, reply2) {
          reply2.should.eql("I hate that color.");
          done();
        });
      });
    });

  });

  after(help.after);
});