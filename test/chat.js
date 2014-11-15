
var mocha = require("mocha");
var should  = require("should");
var fs = require("fs");
var parse = require("../lib/parse")();
var script = require("../index");
var bot;

describe('Super Script Chat - Bot topics', function(){

  before(function(done){
    fs.exists('./test/fixtures/cache/chat.json', function (exists) {
      if (!exists ) {
        parse.loadDirectory('./test/fixtures/chat', function(err, result){
          fs.writeFile('./test/fixtures/cache/chat.json', JSON.stringify(result), function (err) {
            if (err) throw err;
            new script('./test/fixtures/cache/chat.json', { reasoning: false }, function(err, botx) {
              bot = botx;
              bot.userConnect("someuser");
              done();
            });           
          });
        });
      } else {
        console.log("Loading Cached Script");
        new script('./test/fixtures/cache/chat.json', { reasoning: false }, function(err, botx) {
          bot = botx;
          bot.userConnect("someuser");
          done();
        });
      }
    });
  });
  

  describe('Chat commands', function(){
    it("Should talk ", function(done) {
      
      bot.on("message", function(userName, botReply) {
        botReply.should.not.be.empty;
        done();
      });
      
    });
  });

});


