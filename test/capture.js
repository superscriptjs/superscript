var mocha = require("mocha");
var should  = require("should");
var fs = require("fs");

var script = require("../index");
var parse = require("../lib/parse");
var bot;

describe('Super Script Capture System', function(){

  before(function(done){
    fs.exists('./test/fixtures/cache/capture.json', function (exists) {
      if (!exists ) {
        parse.loadDirectory('./test/fixtures/capture', function(err, result){
          fs.writeFile('./test/fixtures/cache/capture.json', JSON.stringify(result), function (err) {
            if (err) throw err;
            new script('./test/fixtures/cache/capture.json', null, function(err, botx) {
              bot = botx;
              done();
            });
          });
        });
      } else {
        console.log("Loading Cached Script");
        new script('./test/fixtures/cache/capture.json', null, function(err, botx) {
          bot = botx;
          done();
        });
      }
    });
  });

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
});