var mocha = require("mocha");
var should  = require("should");
var fs = require("fs");
var parse = require("../lib/parse");
var script = require("../index");
var bot;

describe('Super Script QType Matching', function(){

 before(function(done){
  fs.exists('./test/fixtures/cache/qtype.json', function (exists) {
    if (!exists ) {
      parse.loadDirectory('./test/fixtures/qtype', function(err, result){
        fs.writeFile('./test/fixtures/cache/qtype.json', JSON.stringify(result), function (err) {
          if (err) throw err;
          new script('./test/fixtures/cache/qtype.json', { reasoning: false }, function(err, botx) {
            bot = botx;
            done();
          });           
        });
      });
    } else {
      console.log("Loading Cached Script");
      new script('./test/fixtures/cache/qtype.json', { reasoning: false }, function(err, botx) {
        bot = botx;
        done();
      });
    }
  });
 });

  describe('Simple Question Matching (qSubType)', function(){
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

  describe('Advanced Question Matching (qType)', function(){
    it("should reply to QType string YN QType", function(done) {
      bot.reply("user1", "Do you like to clean?", function(err, reply) {
        reply.should.eql("a");
        done();
      });
    });
    
    it("should reply to QType string B", function(done) {
      bot.reply("user1", "Who can clean the house?", function(err, reply) {
        reply.should.eql("b");
        done();
      });
    });

    it("should reply to QType string C", function(done) {
      bot.reply("user1", "How fast can you clean?", function(err, reply) {
        reply.should.eql("c");
        done();
      });
    });

  });

});