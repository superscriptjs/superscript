var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe('Super Script Redirects', function(){

  before(help.before("redirect"));

  describe('Redirect Interface', function(){
    it("should redirect on match", function(done) {
      bot.reply("user1", "testing redirects", function(err, reply) {
        reply.string.should.eql("redirect test pass");
        done();
      });
    });
  });

  describe('Inline Redirect Interface', function(){
    it("should redirect on match", function(done) {
      bot.reply("user1", "this is an inline redirect", function(err, reply) {
        reply.string.should.eql("lets redirect to redirect test pass");
        done();
      });
    });
  });

  describe('Inline Redirect two message in one reply', function(){
    it("should redirect on match complex message", function(done) {
      bot.reply("user1", "this is an complex redirect", function(err, reply) {
        reply.string.should.eql("this game is made up of 2 teams");
        done();
      });
    });
  });

  describe('Inline Redirect Interface nested inline redirects', function(){
    it("should redirect on match complex nested message", function(done) {
      bot.reply("user1", "this is an nested redirect", function(err, reply) {
        reply.string.should.eql("this message contains secrets");
        done();
      });
    });
  });

  describe('Inline Redirect recurrsion!', function(){
    it("should redirect should save itself", function(done) {
      bot.reply("user1", "this is a bad idea", function(err, reply) {
        reply.string.should.not.be.empty;
        done();
      });
    });
  });

  describe('Inline Redirect with function GH-81', function(){
    it("should parse function and redirect", function(done) {
      bot.reply("user1", "tell me a random fact", function(err, reply) {
        reply.string.should.not.be.empty;
        reply.string.should.containEql("Okay, here's a fact: one . Would you like me to tell you another fact?");
        done();
      });
    });

   it("should parse function and redirect", function(done) {
     bot.reply("user1", "tell me a random fact two", function(err, reply) {
       reply.string.should.not.be.empty;
       reply.string.should.containEql("Okay, here's a fact. one Would you like me to tell you another fact?");
       done();
     });
   }); 
  });

  describe('Redirect to new topic', function(){
    it("should redirect to new topic", function(done) {
      bot.reply("user1", "hello", function(err, reply) {
        reply.string.should.eql("Is it hot");
        done();
      });
    });

    it("should redirect to new topic dynamically", function(done) {
      bot.reply("user1", "i like school", function(err, reply) {
        reply.string.should.eql("I'm majoring in CS.");
        done();
      });
    });

    it("should redirect to new topic Inline", function(done) {
      bot.reply("user1", "topic redirect test", function(err, reply) {
        reply.string.should.eql("Say this. Say that.");
        done();
      });
    });

    it("should redirect forward capture", function(done) {
      bot.reply("user1", "topic redirect to fishsticks", function(err, reply) {
        reply.string.should.eql("Capture forward fishsticks");
        done();
      });
    });


  });


  after(help.after);
});