var mocha = require("mocha");
var should  = require("should");

var fs = require("fs");
var parse = require("../lib/parse");

var script = require("../index");
var bot;


// Testing topics that include and mixin other topics.
describe('Super Script Topic Hooks', function(){

  before(function(done){
    fs.exists('./test/fixtures/cache/topichooks.json', function (exists) {
      if (!exists ) {
        parse.loadDirectory('./test/fixtures/hooks', function(err, result){
          fs.writeFile('./test/fixtures/cache/topichooks.json', JSON.stringify(result), function (err) {
            if (err) throw err;
            new script('./test/fixtures/cache/topichooks.json', { reasoning: false }, function(err, botx) {
              bot = botx;
              done();
            });           
          });
        });
      } else {
        console.log("Loading Cached Script");
        new script('./test/fixtures/cache/topichooks.json', { reasoning: false }, function(err, botx) {
          bot = botx;
          done();
        });
      }
    });
  });

  describe('Pre/Post Topic Hooks', function() {
    it("pre topic should be called", function(done) {
      bot.reply("user1", "pre hook", function(err, reply) {
        reply.should.eql("yep pre hook");
        done();
      });
    });

    it("post topic should be called", function(done) {
      bot.reply("user1", "post hook", function(err, reply) {
        reply.should.eql("yep post hook");
        done();
      });
    });

    it("normal topic should be called", function(done) {
      bot.reply("user1", "this is random", function(err, reply) {
        reply.should.eql("we are in random");
        done();
      });
    });
    

  });

});