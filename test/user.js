var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe.only('Super Script User Presist', function(){

  before(help.before("user"));

  describe('Should save users session', function(){
    it("should save user session", function(done) {
      bot.reply("user1", "Hello, my name is Rob.", function(err, reply) {
        reply.should.eql("Nice to meet you Rob.");

        // this disconnects the bot and kills the globals.
        help.softAfter(done);
      });
    });
    
    it("it remember my name", function(done) {
      // Call startup again (same as before hook)
      var startup = help.before("user");
      startup(function(){
        bot.reply("user1", "Hello again.", function(err, reply) {
          reply.should.eql("Hi Rob")
          done();
        });
      });
    });
  });


  after(help.after);

});