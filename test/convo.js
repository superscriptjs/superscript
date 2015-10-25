var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe('Super Script Conversation', function(){

  before(help.before("convo"));

  describe('Conversations', function(){

    it("should not trigger conversation - no last reply", function(done) {
      bot.reply("user1", "redirect testconversation trigger two", function(err, reply) {
        reply.string.should.eql("trigger two test ok. lastreply does not exist.");
        done();
      });
    });

    it("should not trigger wildcard conversation - no last reply", function(done) {
      bot.reply("user1", "test testconversation wildcard in lastreply", function(err, reply) {
        reply.string.should.eql("matched by catch all wildcard.");
        done();
      });
    });

    it("should trigger first reply", function(done) {
      bot.reply("user1", "redirect testconversation trigger one", function(err, reply) {
        reply.string.should.eql("trigger one test ok");
        done();
      });
    });

    it("should trigger conversation from last reply", function(done) {
      bot.reply("user1", "redirect testconversation trigger two", function(err, reply) {
        reply.string.should.eql("trigger two test ok. lastreply is trigger one test ok.");
        done();
      });
    });

    it("should trigger wildcard from last reply", function(done) {
      bot.reply("user1", "redirect testconversation wildcard in lastreply", function(err, reply) {
        reply.string.should.eql("wildcard in lastreply test ok");
        done();
      });
    });

  });


  describe('Volley', function(){

    it("should have volley", function(done) {
      bot.reply("user1", "Can you skip rope?", function(err, reply) {
        bot.getUser("user1", function(e, user){
          user.volley.should.eql(0);
          done();
        });
      });
    });

    it("should have volley 1", function(done) {
      bot.reply("user1", "Can you jump rope?", function(err, reply) {
        bot.getUser("user1", function(e, user){
          user.volley.should.eql(1);
          user.rally.should.eql(1);

          bot.reply("user1", "Have you done it lately?", function(err, reply) {
            bot.getUser("user1", function(e, user){
              user.volley.should.eql(0);
              user.rally.should.eql(0);
              done();
            });
          });
        });
      });
    });

  });

  after(help.after);
});
