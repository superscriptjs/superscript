var mocha = require("mocha");
var should  = require("should");

var script = require("../index");
var bot = new script();

describe('Super Script POS Matching', function(){

 before(function(done){
    bot.loadDirectory("./test/fixtures/redirect", function(err, res) {
    	done();
    });
  });

	describe('Redirect Interface', function(){
		it("should redirect on match", function(done) {
			bot.reply("user1", "testing redirects", function(err, reply) {
				reply.should.eql("redirect test pass");
				done();
			});
		});
	});

})