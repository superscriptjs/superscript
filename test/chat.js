var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe('Super Script Chat - Bot topics', function(){

  before(help.before("chat"));

  describe('Chat commands', function(){
    it("Should talk ", function(done) {
      bot.userConnect("user1");

      bot.on("message", function(user1, botReply) {
        botReply.should.not.be.empty;
        done();
      });
      
    });
  });

  after(help.after);
});