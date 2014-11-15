var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

// Testing topics that include and mixin other topics.
describe('Super Script Topic Hooks', function(){

  before(help.before("topichooks"));

  describe('Pre/Post Topic Hooks', function() {
    it("pre topic should be called", function(done) {
      bot.reply("user1", "pre hook", function(err, reply) {
        reply.should.eql("yep pre hook");
        done();
      });
    });

    it("post topic should be called", function(done) {
      bot.reply("user1", "post hook", function(err, reply) {
        reply.should.eql("yep post hook");
        done();
      });
    });

    it("normal topic should be called", function(done) {
      bot.reply("user1", "this is random", function(err, reply) {
        reply.should.eql("we are in random");
        done();
      });
    });
  
  });

  after(help.after);

});