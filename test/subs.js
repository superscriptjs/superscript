var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe('SuperScript substitution Interface', function(){

  before(help.before("substitution"));
 
  describe('Message Subs', function(){
    it("name subsitution", function(done) {
      bot.reply("user1", "Rob is here", function(err, reply) {
        reply.should.eql("hi Rob");
        done();
      });
    });

    it("name subsitution - 2", function(done) {
      bot.reply("user1", "Rob is taller than Heather", function(err, reply) {
        reply.should.eql("Heather is shorter than Rob");
        done();
      });
    });

    it("name subsitution - 3", function(done) {
      bot.reply("user1", "Rob Ellis is taller than Heather Allen", function(err, reply) {
        reply.should.eql("Heather Allen is shorter than Rob Ellis");
        done();
      });
    });

    it("name subsitution - 4", function(done) {
      bot.reply("user1", "Rob is taller than Rob", function(err, reply) {
        reply.should.eql("");
        done();
      });
    });


    it("verb pronoun noun subsitution ", function(done) {
      bot.reply("user1", "She ran to Vancouver", function(err, reply) {
        reply.should.eql("okay");
        done();
      });
    });
  });  

  after(help.after);

});
