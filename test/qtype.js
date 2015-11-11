var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe('Super Script QType Matching', function(){

  before(help.before("qtype"));

  describe('Simple Question Matching (qSubType)', function(){
    it("should reply to simple string", function(done) {
      bot.reply("user1", "which way to the bathroom?", function(err, reply) {
        reply.string.should.eql("Down the hall on the left");
        done();
      });
    });

    it("should not match", function(done) {
      bot.reply("user1", "My mom cleans the bathroom.", function(err, reply) {
        reply.string.should.eql("");
        done();
      });
    });
  });

  describe('Advanced Question Matching (qType)', function(){
    it("should reply to QType string YN QType", function(done) {
      bot.reply("user1", "Do you like to clean?", function(err, reply) {
        reply.string.should.eql("a");
        done();
      });
    });
    
    // HUN:ind should be ordered higher up the queue.
    it("should reply to QType string B (fine grained)", function(done) {
      bot.reply("user1", "Who can clean the house?", function(err, reply) {
        reply.string.should.eql("a");
        done();
      });
    });

    it("should reply to QType string C", function(done) {
      bot.reply("user1", "How fast can you clean?", function(err, reply) {
        reply.string.should.eql("c");
        done();
      });
    });

  });

  after(help.after);

});