var mocha = require("mocha");
var should  = require("should");

var fs = require("fs");
var parse = require("../lib/parse")();

var script = require("../index");
var bot;


// We have a bug some replies in non-keep can change the topic
describe('Super Script Topics', function(){


  before(function(done){
    fs.exists('./test/fixtures/cache/topicflags.json', function (exists) {
      if (!exists ) {
        parse.loadDirectory('./test/fixtures/topics', function(err, result){
          fs.writeFile('./test/fixtures/cache/topicflags.json', JSON.stringify(result), function (err) {
            if (err) throw err;
            new script('./test/fixtures/cache/topicflags.json', { reasoning: false }, function(err, botx) {
              bot = botx;
              done();
            });           
          });
        });
      } else {
        console.log("Loading Cached Script");
        new script('./test/fixtures/cache/topicflags.json', { reasoning: false }, function(err, botx) {
          bot = botx;
          done();
        });
      }
    });
  });

  describe('Topics - NoStay', function(){
    // "i am going to stay and go"
    it("topic should have noStay flag", function(done){
      bot._topicFlags['nostay'].should.containEql("nostay");
      
      // Lets change to this topic
      bot.reply("user1", "set topic to nostay", function(err, reply){
        reply.should.eql("Okay we are going to nostay");
        
        var ct = bot.getUser("user1").getTopic();
        ct.should.eql("nostay");


        // Lets say something in this topic
        bot.reply("user1", "i am going to stay and go", function(err, reply2){
          reply2.should.eql("topic test pass");

          var ct = bot.getUser("user1").getTopic();
          ct.should.eql("random"); // nostay

          done();
        });
      });
      
    });
  });

  describe('Topics - Keep', function(){

    it("topic should have keep flag", function(done){
      bot._topicFlags['keeptopic'].should.containEql("keep");
      done();
    });

    it("should keep topic for reuse", function(done){
      bot.reply("user1", "set topic to keeptopic", function(err, reply) {
        reply.should.eql("Okay we are going to keeptopic");
        var ct = bot.getUser("user1").getTopic();
        ct.should.eql("keeptopic");

        bot.reply("user1", "i have one thing to say", function(err, reply) {
          reply.should.eql("topic test pass");          
          bot.reply("user1", "i have one thing to say", function(err, reply) {
            reply.should.eql("topic test pass");          
            done();
          });
        });

      });
    });

    
    it("should not repeat itself", function(done){
      // Manually reset the topic
      // bot.getUser("user1").setTopic("random");
      bot.getUser("user1").currentTopic = "random"

      bot.reply("user1", "set topic to dry", function(err, reply) {
        // Now in dry topic
        var ct = bot.getUser("user1").getTopic();
        ct.should.eql("dry");

        bot.reply("user1", "this is a dry topic", function(err, reply2) {
          
          reply2.should.eql("dry topic test pass");

          // Say it again...
          bot.reply("user1", "this is a dry topic", function(err, reply3) {
            // If something was said, we don't say it again
            console.log("Second time.. should be empty", reply3)
            reply3.should.eql("");
            done();
          });
        });
      });
    });

    // This test we are going to hit a duplicate reply, one is in a keep topic, and one is not
    // We expect it to repeat it because it is allowed.
    // This test is dependant on the first test 
    it("should not repeat itself 2", function(done){
      // Manually reset the topic
      bot.getUser("user1").currentTopic = "random"

      bot.reply("user1", "set topic to dry again", function(err, reply) {
        // Now in dry topic
        var ct = bot.getUser("user1").getTopic();
        ct.should.eql("dry");

        bot.reply("user1", "i have one thing to say", function(err, reply2) {         
          reply2.should.eql("dry topic test pass");
      
          // Say it again, now it should be removed
          bot.reply("user1", "i have one thing to say", function(err, reply3) {
            // If something was said, we don't say it again
            reply3.should.eql("");
            done();
          });
        });
      });
    });

  });

});