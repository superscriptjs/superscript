var mocha = require("mocha");
var should  = require("should");
var fs = require("fs");
var parse = require("../lib/parse");

var script = require("../index");
var bot;

describe('Super Script Conversation', function(){


  before(function(done){
    fs.exists('./test/fixtures/cache/convo.json', function (exists) {
     if (!exists ) {
       parse.loadDirectory('./test/fixtures/convo', function(err, result){
         fs.writeFile('./test/fixtures/cache/convo.json', JSON.stringify(result), function (err) {
           if (err) throw err;
           new script('./test/fixtures/cache/convo.json', null, function(err, botx) {
             bot = botx;
             done();
           });           
         });
       });
     } else {
       console.log("Loading Cached Script");
       new script('./test/fixtures/cache/convo.json', null, function(err, botx) {
         bot = botx;
         done();
       });
     }
    });
  });

  describe('Volley', function(){
    
    it("should have volley", function(done) {
      bot.reply("user1", "Can you skip rope?", function(err, reply) {
        bot.getUser("user1").volley.should.eql(0);
        done();
      });
    });

    it("should have volley 1", function(done) {
      bot.reply("user1", "Can you jump rope?", function(err, reply) {
        bot.getUser("user1").volley.should.eql(1);
        bot.getUser("user1").rally.should.eql(1);
        bot.reply("user1", "Have you done it lately?", function(err, reply) {
          bot.getUser("user1").volley.should.eql(0);
          bot.getUser("user1").rally.should.eql(0);
          done();
        });
      });
    });
  });
});