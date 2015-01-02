var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

// Testing topics that include and mixin other topics.
describe.only('SuperScript TopicsSystem', function(){

  before(help.before("topicsystem"));

  describe('TopicSystem', function() {
    it.only("Should skip empty replies until it finds a match", function(done){
      bot.reply("testing topic system", function(err, reply){
        ["we like it","i hate it"].should.containEql(reply);
        done();
      });
    });
  });

  describe('TopicDiscovery', function() {
    it("Should find the right topic", function(done){
      bot.reply("i like to hunt", function(err, reply){
        reply.should.containEql("i like to spend time outdoors");

        bot.reply("i like to fish", function(err, reply){
          reply.should.containEql("me too");
          done();
        });

      });
    });
  });

  after(help.after);
});