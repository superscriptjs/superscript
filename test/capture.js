/*global describe, it, bot, before, after */
var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

// The bulk of these tests now live in ss-parser, that script manages the
// input capture infterface.

describe('Super Script Capture System', function(){

  before(help.before("capture"));

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
