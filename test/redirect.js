var mocha = require("mocha");
var should  = require("should");

var fs = require("fs");
var parse = require("../lib/parse");

var script = require("../index");
var bot;

describe('Super Script Redirects', function(){


  before(function(done){
    fs.exists('./test/fixtures/cache/redirect.json', function (exists) {
      if (!exists ) {
        parse.loadDirectory('./test/fixtures/redirect', function(err, result){
          fs.writeFile('./test/fixtures/cache/redirect.json', JSON.stringify(result), function (err) {
            if (err) throw err;
            new script('./test/fixtures/cache/redirect.json', { reasoning: false }, function(err, botx) {
              bot = botx;
              done();
            });           
          });
        });
      } else {
        console.log("Loading Cached Script");
        new script('./test/fixtures/cache/redirect.json', { reasoning: false }, function(err, botx) {
          bot = botx;
          done();
        });
      }
    });
  });

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


});