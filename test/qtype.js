var mocha = require("mocha");
var should  = require("should");
var fs = require("fs");
var sfact = require("sfacts");
var script = require("../index");
var bot;

var bootstrap = function(cb) {
  sfact.load(['./test/fixtures/concepts/test.top'], 'factsystem', function(err, db){
    cb(null, sfact.explore("factsystem"));
  });
}

describe('Super Script QType Matching', function(){

  before(function(done){
    fs.exists('./test/fixtures/cache/qtype.json', function (exists) {
      if (!exists) {
        bootstrap(function(err, facts) {
          var parse = require("../lib/parse")(facts);
          parse.loadDirectory('./test/fixtures/qtype', function(err, result){
            fs.writeFile('./test/fixtures/cache/qtype.json', JSON.stringify(result), function (err) {
              if (err) throw err;
              new script('./test/fixtures/cache/qtype.json', { factSystem: facts }, function(err, botx) {
                bot = botx;
                done();
              });
            });           
          });
        });
      } else {
        console.log("Loading Cached Script");
        bootstrap(function(err, facts) {
          new script('./test/fixtures/cache/qtype.json', { factSystem: facts }, function(err, botx) {
            bot = botx;
            done();
          });
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
        reply.should.eql("a");
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

  describe('Advanced Question Matching (fine grained)', function(){
    it("should match fine grained results", function(done){
      bot.reply("user1", "Who looks like Matt Damon?", function(err, reply) {
        reply.should.eql("a");
        done();
      });
    });
  });

  after(function(done){
    rmdir("./factsystem", done);
  });

});