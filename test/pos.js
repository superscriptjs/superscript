var mocha = require("mocha");
var should  = require("should");

var script = require("../index");
var bot = new script();

describe('Super Script POS Matching', function(){

 before(function(done){
    bot.loadDirectory("./test/fixtures", function(err, res) {
    	done();
    });
  });

 	describe('Simple POS Matching', function(){
		it("should reply to simple string", function(done) {
			bot.reply("user1", "Can you skip rope ?", function(err, reply) {
				reply.should.eql("Pos test one");
				done();
			});
		});

		it("should match alt string", function(done) {
			// Should match the same as above 
			bot.reply("user1", "Can you sing song ?", function(err, reply) {
				reply.should.eql("Pos test one");
				done();
			});
		});
	});

});