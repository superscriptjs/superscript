var fs = require("fs");

var mocha = require("mocha");
var should  = require("should");
var parse = require("../lib/parse")();
var script = require("../index");
var bot;

describe('Super Script Continue System', function(){

  before(function(done){
   fs.exists('./test/fixtures/cache/continue.json', function (exists) {
     if (!exists ) {
       parse.loadDirectory('./test/fixtures/continue', function(err, result){
         fs.writeFile('./test/fixtures/cache/continue.json', JSON.stringify(result), function (err) {
           if (err) throw err;
           new script('./test/fixtures/cache/continue.json', null, function(err, botx) {
             bot = botx;
             done();
           });           
         });
       });
     } else {
       console.log("Loading Cached Script");
       new script('./test/fixtures/cache/continue.json', null, function(err, botx) {
         bot = botx;
         done();
       });
     }
   });
  });

  describe('Match and continue', function(){

    it("should continue", function(done) {
      bot.reply("user1", "i went to highschool", function(err, reply) {
        reply.should.eql("did you finish ?");
        bot.reply("user1", "then what happened?", function(err, reply2) {
          reply2.should.eql("i went to university");
          done();
        });
      });
    });

    it("should continue 2 - yes", function(done) {
      bot.reply("user1", "i like to travel", function(err, reply) {
        reply.should.eql("have you been to Madird?");
        bot.reply("user1", "yes it is the capital of spain!", function(err, reply2) {
          reply2.should.eql("Madird is amazing.");
          done();
        });
      });
    });
    
    it("should continue 3 - no", function(done) {
      bot.reply("user1", "i like to travel", function(err, reply) {
        reply.should.eql("have you been to Madird?");
        bot.reply("user1", "never", function(err, reply2) {
          reply2.should.eql("Madird is my favorite city.");
          done();
        });
      });
    });

  });
});