var mocha = require("mocha");
var should  = require("should");

var fs = require("fs");
var parse = require("../lib/parse");

var script = require("../index");
var bot;


// Testing topics that include and mixin other topics.
describe('Super Script Topics Structure', function(){

  before(function(done){
    fs.exists('./test/fixtures/cache/topicstruct.json', function (exists) {
      if (!exists ) {
        parse.loadDirectory('./test/fixtures/topics2', function(err, result){
          fs.writeFile('./test/fixtures/cache/topicstruct.json', JSON.stringify(result), function (err) {
            if (err) throw err;
            new script('./test/fixtures/cache/topicstruct.json', { reasoning: false }, function(err, botx) {
              bot = botx;
              done();
            });           
          });
        });
      } else {
        console.log("Loading Cached Script");
        new script('./test/fixtures/cache/topicstruct.json', { reasoning: false }, function(err, botx) {
          bot = botx;
          done();
        });
      }
    });
  });

  describe('Topics Include', function() {
    it("testing include & inherits", function(done){
      
      // We should be in random and switch to test2.
      bot.reply("user1", "topic change", function(err, reply){
        reply.should.eql("Okay we are going to test2");
        bot.getUser("user1").currentTopic.should.eql("test2");
        
        // from test2, I should be able to say match test3 (because it is included)
        bot.reply("user1", "this is test3", function(err, reply){
          reply.should.eql("testing3");

          bot.reply("user1", "this is test4", function(err, reply){
            reply.should.eql("testing4");
            done();
          });

        });
      });
    });
  });

  // describe('Topics Inherits', function() {
  // it("testing include", function(done){
    
  //   // We should be in random and switch to test2.
  //   bot.reply("user1", "topic change", function(err, reply){
  //     reply.should.eql("Okay we are going to test2");
  //     bot.getUser("user1").currentTopic.should.eql("test2");
      
  //     // from test2, I should be able to say match test3 (because it is included)
  //     bot.reply("user1", "this is test3", function(err, reply){
  //       reply.should.eql("testing3");
  //       done();
  //     });
  //   });

  // });
  // });


});