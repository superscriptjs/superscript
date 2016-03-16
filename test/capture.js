var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe('Super Script Capture System', function(){

  before(help.before("capture"));

  describe('Simple Capture should return capture tag', function(){

    it("X is Y", function(done) {
      bot.reply("user1", "x is related to y", function(err, reply) {
        reply.string.should.eql("x is y");
        done();
      });
    });


    it("should capture optionals", function(done) {
      bot.reply("user1", "new capture interface", function(err, reply) {
        reply.string.should.eql("capture test interface");
        done();
      });
    });

    it("should not capture alternate", function(done) {
      bot.reply("user1", "new capture interface two", function(err, reply) {
        reply.string.should.eql("capture test undefined");
        done();
      });
    });

    it("should capture var length star", function(done) {
      bot.reply("user1", "new capture interface three", function(err, reply) {
        reply.string.should.eql("capture test interface");
        done();
      });
    });

    it("should capture exact length star", function(done) {
      bot.reply("user1", "new capture interface four", function(err, reply) {
        reply.string.should.eql("capture test interface");
        done();
      });
    });

    it("should capture wordnet", function(done) {
      bot.reply("user1", "new capture love wordnet", function(err, reply) {
        reply.string.should.eql("capture test love");
        done();
      });
    });

    it("stars should not capture", function(done) {
      bot.reply("user1", "new capture system is great", function(err, reply) {
        reply.string.should.eql("capture test undefined");
        done();
      });
    });

  });

  describe('Previous Capture should return previous capture tag', function(){
    it("Previous capture", function(done) {
      bot.reply("user1", "previous capture one interface", function(err, reply) {
        reply.string.should.eql("previous capture test one interface");
        bot.reply("user1", "previous capture two", function(err, reply) {
          reply.string.should.eql("previous capture test two interface");
          done();
        });
      });
    });
  });

  describe("GH-128", function() {
    it("GH-128 exact wildcard", function(done) {
      bot.reply("user1", "bill is taller than bob", function(err, reply) {
        reply.string.should.eql("bill is taller than bob");
        done();
      });
    });

    it("GH-128 variable wildcard", function(done) {
      bot.reply("user1", "bill is smaller than bob", function(err, reply) {
        reply.string.should.eql("bill is smaller than bob");
        done();
      });
    });

    it("GH-128 min-max wildcard", function(done) {
      bot.reply("user1", "bill is bigger than bob", function(err, reply) {
        reply.string.should.eql("bill is bigger than bob");
        done();
      });
    });

  });

  describe("Match <input>", function() {
    it("It should capture the last thing said", function(done) {
      bot.reply("user1", "capture input", function(err, reply) {
        reply.string.should.eql("capture input");
        done();
      });
    });

  });

  after(help.after);
});