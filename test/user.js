var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

// This test needs to be manually run.
// We done the frist block to create the DB 
// then the second to check to see if it works,
// I found this less work then figuring out how to setup a new 
// process to spawn each block.
// In this suite, the after hook does not delete the DB
// so that will have to be torn down manually.

describe.skip('Super Script User Presist', function(){

  before(help.before("user"));

  describe('Should save users session', function(){
  
    it.skip("should save user session", function(done) {
      bot.reply("iuser1", "Hello, my name is Rob.", function(err, reply) {
        reply.should.eql("Nice to meet you Rob.");
        done()
      });
    });
    
    it.skip("it remember my name", function(done) {
      // Call startup again (same as before hook)
      bot.reply("iuser1", "Hello again.", function(err, reply) {
        reply.should.eql("Hi Rob")
        done();
      });

    });
  });

  after(function(done){
    done();
  });

  // after(help.after);

});