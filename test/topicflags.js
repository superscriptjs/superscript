var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe('Super Script Topics', function(){

  before(help.before("topicflags"));

  describe('Topic Functions', function(){
    it("should fetch a list of topics", function(done){
      var cu = bot.userConnect("user1");
      var message = {lemString: "hello world"};
      bot.topicSystem.findPendingTopicsForUser(cu, message, function(e,topics){
        topics.should.not.be.empty;
        done();  
      });
    });

    it("find topic by Name", function(done){
      var rand = bot.topicSystem.findTopicByName('random');      
      rand.should.not.be.empty;
      done();
    });
  });
    
  describe('Topics - System', function(){
    it("topic should have system flag", function(done){
      bot.reply("user1", "this is a system topic", function(err, reply){
        // This really just makes sure the reply is not accesses directly
        reply.should.eql("");
        done();
      });
    });

    it("Go to hidden topic indirectly", function(done){
      bot.reply("user1", "why did you run", function(err, reply){
        // This really just makes sure the reply is not accesses directly
        reply.should.eql("to get away from someone");
        done();
      });
    });

    it("topic recurrsion with respond", function(done){
      bot.reply("user1", "test recursion", function(err, reply){
        reply.should.eql("");
        done();
      });
    });


  });

  // This has regressed.
  describe.skip('Topics - NoStay', function(){
    // "i am going to stay and go"
    it("topic should have noStay flag", function(done){
      
      var t = bot.topicSystem.findTopicByName('nostay');
      t.flags.should.containEql("nostay");
      
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
      var t = bot.topicSystem.findTopicByName('keeptopic');
      t.flags.should.containEql("keep");
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
      // bot.userConnect("user1");
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
            // This was empty, but with the new topic system, we don't match on the rule in
            // dry, it continues onto keep topic and matches here.
            reply3.should.eql("topic test pass");
            done();
          });
        });
      });
    });

  });

  after(help.after);
});