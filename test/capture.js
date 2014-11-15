var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe('Super Script Capture System', function(){

  before(help.before("capture"));

  describe('Simple Capture should return capture tag', function(){

    it("should capture optionals", function(done) {
      bot.reply("user1", "new capture interface", function(err, reply) {
        reply.should.eql("capture test interface");
        done();
      });
    });

    it("should not capture alternate", function(done) {
      bot.reply("user1", "new capture interface two", function(err, reply) {
        reply.should.eql("capture test undefined");
        done();
      });
    });

    it("should capture var length star", function(done) {
      bot.reply("user1", "new capture interface three", function(err, reply) {
        reply.should.eql("capture test interface");
        done();
      });
    });

    it("should capture exact length star", function(done) {
      bot.reply("user1", "new capture interface four", function(err, reply) {
        reply.should.eql("capture test interface");
        done();
      });
    });

    it("should capture wordnet", function(done) {
      bot.reply("user1", "new capture love wordnet", function(err, reply) {
        reply.should.eql("capture test love");
        done();
      });
    });

    it("stars should not capture", function(done) {
      bot.reply("user1", "new capture system is great", function(err, reply) {
        reply.should.eql("capture test undefined");
        done();
      });
    });
  });

  describe("Match <input> and <reply>", function() {
    it("It should capture the last thing said", function(done) {
      bot.reply("user1", "capture input", function(err, reply) {
        reply.should.eql("capture input");
        done();
      });
    })

    // <reply> is not currently working
    it.skip("It should capture the last thing said 2", function(done) {
      bot.reply("user1", "capture input", function(err, reply) {
        reply.should.eql("Don't repeat what I say.");
        done();
      });
    })    
  });

  after(help.after);
});