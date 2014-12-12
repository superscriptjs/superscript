var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

// Testing topics that include and mixin other topics.
describe('Super Script Topics Structure', function(){

  before(help.before("topicstruct"));

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

    it("testing include & inherits 2", function(done){
      
      // We should be in random and switch to test2.
      bot.reply("user1", "change top topic 4 ", function(err, reply){
        reply.should.eql("going to 4");
        bot.getUser("user1").currentTopic.should.eql("test4");
        
        bot.reply("user1", "this is test3", function(err, reply){
          reply.should.eql("not accessible");
          done();

        });

      });
    });
  });



  after(help.after);
});