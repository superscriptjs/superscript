var mocha = require("mocha");
var should  = require("should");

var script = require("../index");
var bot = new script({reasoning:false});

describe('Super Script QType Matching', function(){

 before(function(done){
    bot.loadDirectory("./test/fixtures/qtype", function(err, res) {
      done();
    });
  });

  describe('Simple Question Matching', function(){
    it("should reply to simple string", function(done) {
      bot.reply("user1", "which way to the bathroom?", function(err, reply) {
        reply.should.eql("Down the hall on the left");
        done();
      });
    });

    it("should not match", function(done) {
      bot.reply("user1", "My mom cleans the bathroom.", function(err, reply) {
        reply.should.eql("");
        done();
      });
    });

  });

  describe.only('Advanced Question Matching', function(){
    it("should reply to QType string", function(done) {
      bot.reply("user1", "Do you like to clean?", function(err, reply) {
        reply.should.eql("yes");
        done();
      });
    });


  });

});