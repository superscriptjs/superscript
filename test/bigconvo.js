var mocha = require("mocha");
var fs = require("fs");
var should  = require("should");
var parse = require("../lib/parse");
var script = require("../index");
var bot;

describe.skip('Super Script Script Interface', function(){

 before(function(done){
  fs.exists('./test/fixtures/cache/bigconvo.json', function (exists) {
    if (!exists ) {
      parse.loadDirectory('./test/fixtures/bigconvo', function(err, result){
        fs.writeFile('./test/fixtures/cache/bigconvo.json', JSON.stringify(result), function (err) {
          if (err) throw err;
          new script('./test/fixtures/cache/bigconvo.json', { reasoning: false }, function(err, botx) {
            bot = botx;
            done();
          });           
        });
      });
    } else {
      console.log("Loading Cached Script");
      new script('./test/fixtures/cache/bigconvo.json', { reasoning: false }, function(err, botx) {
        bot = botx;
        done();
      });
    }
  });
 });

  describe('Big convo, to get a sence of time', function(){
    it("should reply to simple string", function(done) {
      bot.reply("user1", "can you make phone calls for me", function(err, reply) {
        reply.should.eql("");
        // reply.should.eql("reply with this");
        done();
      });
    });
  });
});