var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

// Testing topics that include and mixin other topics.
describe.only('SuperScript TopicsSystem', function(){

  before(help.before("topicsystem"));

  describe('TopicSystem', function() {
    it("Should skip empty replies until it finds a match", function(done){
      bot.reply("testing topic system", function(err, reply){
        ["we like it","i hate it"].should.containEql(reply.string);
        done();
      });
    });

    it("Should create a new topic & use it", function(done){
      var newTopic = bot.topicSystem.createTopic('food');
      var trig = "Do you like food?";
      var replies = ["Yes, Turkey is my favourite."];
      var trigger = newTopic.addTrigger(trig, replies);

      // Now lets try to match!
      bot.reply("do you like food", function(err, reply){
        reply.string.should.containEql("Yes, Turkey is my favourite.");

        // Add another reply
        trigger.addReply("I like food");
        // We can add a reply to a trigger too.
        // The first one should already be gone, so this one will fire next.
        bot.reply("do you like food", function(err, reply){
          reply.string.should.containEql("I like food");
          done();
        });
      });
    });

  });

  describe('TopicDiscovery', function() {
    it("Should find the right topic", function(done){
      bot.reply("i like to hunt", function(err, reply){
        reply.string.should.containEql("i like to spend time outdoors");

        bot.reply("i like to fish", function(err, reply){
          reply.string.should.containEql("me too");
          done();
        });

      });
    });
  });

  // Test concept expansion
  // Test conversation


  after(help.after);
});