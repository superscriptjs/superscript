var mocha = require("mocha");
var should  = require("should");

var script = require("../index");
var bot = new script();

describe('Super Script Resoning Interface', function(){

 before(function(done){
    bot.loadDirectory("./test/fixtures/script", function(err, res) {
    	done();
    });
  });

	describe('Math Reasoning', function(){
 		it("should evaluate math expressions 1", function(done) {
 			bot.reply("user1", "what is 1 + 1", function(err, reply) {
 				reply.should.eql("I think it is 2");
 				done();
 			});
 		});

 		it("should evaluate math expressions 2", function(done) {
 			bot.reply("user1", "what is half of two times 16", function(err, reply) {
 				reply.should.eql("I think it is 16");
 				done();
 			});
 		});

 		it("should evaluate math expressions 3", function(done) {
 			bot.reply("user1", "what is two thousand and fifty plus one hundred and 5?", function(err, reply) {
 				reply.should.eql("I think it is 2155");
 				done();
 			});
 		});

 		it("should evaluate math expressions 4 - Round 2 places", function(done) {
 			bot.reply("user1", "what is 7/3?", function(err, reply) {
 				reply.should.eql("I think it is 2.33");
 				done();
 			});
 		});

 		it("should evaluate math expressions 5 - Percent", function(done) {
 			bot.reply("user1", "what is 20% of 120", function(err, reply) {
 				reply.should.eql("I think it is 24");
 				done();
 			});
 		});

	});

	describe.skip("Reason 2", function(){
		it("should evaluate math expressions 4", function(done) {
			bot.reply("user1", "how many letters in the name Bill?", function(err, reply) {
				reply.should.eql("4");
				done();
			});
		});
	});
});