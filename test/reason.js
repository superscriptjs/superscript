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
 		
 		it("should not change the numbers", function(done) {
 			bot.reply("user1", "what is one plus one", function(err, reply) {
 				reply.should.eql("It is two.");
 				done();
 			});
 		});

 		it("should evaluate math expressions 1", function(done) {
 			bot.reply("user1", "what is 1 + 1", function(err, reply) {
 				reply.should.eql("I think it is 2");
 				done();
 			});
 		});

 		it("should evaluate math expressions 1b", function(done) {
 			bot.reply("user1", "what is one of one", function(err, reply) {
 				reply.should.eql("I think it is 1");
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

 		it("should evaluate math expressions 6 - Memory", function(done) {
 			bot.reply("user1", "what is ten plus ten", function(err, reply) {
 				reply.should.eql("I think it is 20");
 				bot.reply("user1", "plus ten more", function(err, reply) {
 					reply.should.eql("I think it is 30");
 					bot.reply("user1", "minus 5", function(err, reply) {
 						reply.should.eql("I think it is 25");
 						done();
 					});
 				});
 			});
 		});

	});

	describe("Reason 2 - Compare concepts", function(){
		it("should evaluate compare concepts, 2 nouns and 2 oppisite terms", function(done) {
			bot.reply("user1", "If John is taller than Mary, who is the shorter?", function(err, reply) {
				reply.should.eql("Mary is shorter than John.");
				done();
			});
		});

		it("should evaluate compare concepts, 2 nouns and 2 non oppisite terms", function(done) {
			bot.reply("user1", "If John is taller than Mary, who is the taller?", function(err, reply) {
				reply.should.eql("John is taller than Mary.");
				done();
			});
		});

		it("should evaluate compare concepts, no need to reply yet", function(done) {
			bot.reply("user1", "John is older than Mary, and Mary is older than Sarah.", function(err, reply) {
				reply.should.eql("");
				done();
			});
		});

		it("should evaluate compare concepts, now reply", function(done) {
			bot.reply("user1", "Who is older Sarah or Mary?", function(err, reply) {
				reply.should.eql("Mary is older than Sarah, if memory serves.");
				bot.reply("user1", "Who is older John or Sarah?", function(err, reply) {
					reply.should.eql("John is older than Sarah, if memory serves.");
					done();
				});
			});
		});
	});
	describe.only("Reason 3 - Auto Reply", function(){
		it("should reply to the question type", function(done) {
			bot.reply("user1", "How much is a loaf of bread?", function(err, reply) {
				reply.should.eql("");
				done();
			});
		});

	});
});