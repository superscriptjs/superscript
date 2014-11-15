var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe('Super Script Redirects', function(){

  before(help.before("redirect"));

  describe('Redirect Interface', function(){
    it("should redirect on match", function(done) {
      bot.reply("user1", "testing redirects", function(err, reply) {
        reply.should.eql("redirect test pass");
        done();
      });
    });
  });

  describe('Inline Redirect Interface', function(){
    it("should redirect on match", function(done) {
      bot.reply("user1", "this is an inline redirect", function(err, reply) {
        reply.should.eql("lets redirect to redirect test pass");
        done();
      });
    });
  });

  describe('Inline Redirect two message in one reply', function(){
    it("should redirect on match complex message", function(done) {
      bot.reply("user1", "this is an complex redirect", function(err, reply) {
        reply.should.eql("this game is made up of 2 teams");
        done();
      });
    });
  });

  describe('Inline Redirect Interface nested inline redirects', function(){
    it("should redirect on match complex nested message", function(done) {
      bot.reply("user1", "this is an nested redirect", function(err, reply) {
        reply.should.eql("this message contains secrets");
        done();
      });
    });
  });

  describe('Inline Redirect recurrsion!', function(){
    it("should redirect should save itself", function(done) {
      bot.reply("user1", "this is a bad idea", function(err, reply) {
        should.exist(err);
        done();
      });
    });
  });

  after(help.after);
});