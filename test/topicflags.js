var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe('Super Script Topics', function(){

  before(help.before("topicflags"));

  describe.skip('Topic Functions', function(){
    it("should fetch a list of topics", function(done){
      // console.log(JSON.stringify(bot.getTopics(), null, 2))
      // bot.getTopics().should.have.length(5);
      done();
    });

    it("find topic by Name", function(done){
      var rand = bot.findTopicByName('random');
      rand.should.not.be.empty;
      done();
    });

    it("find topic by match", function(done){
      var rand = bot.findTopicByMatch('random');
      rand.should.not.be.empty;
      done();
    });
  });
  

  describe.only('Topics - NoStay', function(){
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

  after(help.after);
});