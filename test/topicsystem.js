var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

// Testing topics that include and mixin other topics.
describe.only('SuperScript TopicsSystem', function(){

  before(help.before("topicsystem"));

  describe('Blurb', function() {
    it("Should match on one topic", function(done){
      bot.reply("testing topic system", function(err, rep){
        console.log(err, rep);
        done();
      });
    });

  });

  after(help.after);
});