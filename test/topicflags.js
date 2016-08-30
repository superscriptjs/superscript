var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

// We need to revisit userConnect 
describe('Super Script Topics', function(){

  before(help.before("topicflags"));

  describe('Topic Functions', function(){
    // This test is failing and Im not sure if random or system topics should be included
    it.skip("should fetch a list of topics", function(done){
      bot.findOrCreateUser("user1", function(err, user){
        var message = {lemString: "hello world"};

        bot.topicSystem.topic.findPendingTopicsForUser(user, message, function(e,topics) {
          topics.should.not.be.empty;
          topics.should.have.length(7);
          done();
        });
      });
    });

    it("find topic by Name", function(done){
      bot.topicSystem.topic.findByName('random', function(err, topic){
        topic.should.not.be.empty;
        done();
      });
    });
  });
    
  describe('Topics - System', function(){
    it("topic should have system flag", function(done){
      bot.reply("user1", "this is a system topic", function(err, reply){
        reply.string.should.be.empty;
        done();
      });
    });

    // Re-check this
    it("Go to hidden topic indirectly", function(done){
      bot.reply("user1", "why did you run", function(err, reply){
        // This really just makes sure the reply is not accesses directly
        reply.string.should.eql("to get away from someone");
        reply.topicName.should.eql("system_why");
        done();
      });
    });

    it("topic recurrsion with respond", function(done){
      bot.reply("user1", "test recursion", function(err, reply){
        reply.string.should.eql("");
        done();
      });
    });

  });

  describe('Topic - sort', function(){

    it("topic should not be orderd by default", function(done) {
      bot.reply("user1", "this should catch some", function(err, reply) {
        bot.topicSystem.topic.findByName('random', function(err, topic) {
          topic.createGambit({input:'this should catch some more'}, function(er, gam) {
            gam.addReply({reply: "New Reply"}, function(err, rep) {
              topic.sortGambits(function() {
                bot.reply("user1", "this should catch some more", function(err, reply) {
                  reply.string.should.eql("New Reply");
                  done();
                });
              });
            });
          });
        });
      });

    });
  });


  describe('Topic Flow', function() {

    it("topic flow 0", function(done) {
      bot.reply("user1", "respond test", function(err, reply) {
        reply.string.should.eql("final");
        done();
      });
    });

    it("topic flow 1", function(done){
      bot.reply("user 10", "testing hidden", function(err, reply) {
        reply.string.should.eql("some reply");

        bot.reply("user 10", "yes", function(err, reply) {
          reply.string.should.eql("this should work.");
          done();
        });

      });
    });

    it("topic flow 2", function(done){
      bot.reply("user2", "testing hidden", function(err, reply) {
        reply.string.should.eql("some reply");

        bot.reply("user2", "lets not go on", function(err, reply) {
          reply.string.should.eql("end");
          done();
        });

      });
    });

  });

  describe('Topics - NoStay Flag', function() {
    it("topic should have keep flag", function(done){
      bot.reply("User1", "testing nostay", function(err, reply) {
        reply.string.should.eql("topic test pass");
        bot.reply("User1", "something else", function(err, reply) {
          reply.string.should.eql("reply in random");
          done();
        });
      });
    });

  });

  describe('Topics - Keep', function() {

    it("topic should have keep flag", function(done){
      bot.topicSystem.topic.findByName('keeptopic', function(err, t) {
        t.keep.should.be.true;
        done();
      });
    });

    it("should keep topic for reuse", function(done){
      bot.reply("user1", "set topic to keeptopic", function(err, reply) {
        reply.string.should.eql("Okay we are going to keeptopic");

        bot.getUser("user1", function(err, cu){
          cu.getTopic().should.eql("keeptopic");
          bot.reply("user1", "i have one thing to say", function(err, reply) {
            reply.string.should.eql("topic test pass");
            bot.reply("user1", "i have one thing to say", function(err, reply) {
              reply.string.should.eql("topic test pass");
              done();
            });
          });

        });
      });
    });
  

    it("should not repeat itself", function(done){
      // Manually reset the topic
      bot.findOrCreateUser("user1", function(err, user){
        user.currentTopic = "random";

        bot.reply("user1", "set topic to dry", function(err, reply) {
          // Now in dry topic
          bot.getUser("user1", function(err, su) {
            ct = su.getTopic();
            ct.should.eql("dry");

            bot.reply("user1", "this is a dry topic", function(err, reply) {
              reply.string.should.eql("dry topic test pass");
              // Say it again...
              bot.reply("user1", "this is a dry topic", function(err, reply) {

                // If something was said, we don't say it again
                reply.string.should.eql("");
                done();
              });
            });

          });
        });
      });
    });
  });

  after(help.after);
});