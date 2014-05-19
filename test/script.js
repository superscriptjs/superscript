var mocha = require("mocha");
var should  = require("should");

var script = require("../index");
var bot = new script();

describe('Super Script Script Interface', function(){

 before(function(done){
    bot.loadDirectory("./test/fixtures/script", function(err, res) {
    	done();
    });
  })

	describe('Simple star Interface *', function(){

		it("should reply to simple string", function(done) {
			bot.reply("user1", "This is a test", function(err, reply) {
				reply.should.eql("Test should pass one");
				done();
			});
		});

		it("should match single star", function(done) {
			bot.reply("user1", "Should match single star", function(err, reply) {
				reply.should.eql("Test two should pass");
				done();
			});
		});

		it("should allow empty star - new behaviour", function(done) {
			bot.reply("user1", "Should match single", function(err, reply) {
				reply.should.eql("Test two should pass");
				done();
			});
		});

		it("should match double star", function(done) {
			bot.reply("user1", "Should match single star two", function(err, reply) {
				reply.should.eql("Test two should pass");
				done();
			});
		});		

		it("capture in reply", function(done) {
			bot.reply("user1", "connect the win", function(err, reply) {
				reply.should.eql("Test should pass");
				done();
			});
		});

	});

	describe('Exact length star interface *n', function(){
		it("should match *2 star - Zero case", function(done) {
			bot.reply("user1", "It is hot out", function(err, reply) {
				reply.should.eql("");
				done();
			});
		});		

		it("should match *2 star - One case", function(done) {
			bot.reply("user1", "It is one hot out", function(err, reply) {
				reply.should.eql("");
				done();
			});
		});

		it("should match *2 star - Two case", function(done) {
			bot.reply("user1", "It is one two hot out", function(err, reply) {
				reply.should.eql("Test three should pass");
				done();
			});
		});		


		it("should match *2 star - Three case", function(done) {
			bot.reply("user1", "It is one two three hot out", function(err, reply) {
				reply.should.eql("");
				done();
			});
		});		

	});

	describe('Variable length star interface *~n', function(){

		it("should match *~2 star - End case", function(done) {
			bot.reply("user1", "define love", function(err, reply) {
				reply.should.eql("Test endstar should pass");
				done();
			});
		});		

		it("should match *~2 star - Zero Star", function(done) {
			bot.reply("user1", "It is hot out2", function(err, reply) {
				reply.should.eql("Test three should pass");
				done();
			});
		});		

		it("should match *~2 star - One Star", function(done) {
			bot.reply("user1", "It is one hot out2", function(err, reply) {
				reply.should.eql("Test three should pass");
				done();
			});
		});		

		it("should match *~2 star - Two Star", function(done) {
			bot.reply("user1", "It is one two hot out2", function(err, reply) {
				reply.should.eql("Test three should pass");
				done();
			});
		});		

		it("should match *~2 star - Three Star (fail)", function(done) {
			bot.reply("user1", "It is one two three four hot out2", function(err, reply) {
				reply.should.eql("");
				done();
			});
		});

		it("should match *~2 star - Return the resuling Star", function(done) {
			bot.reply("user1", "It is foo bar cold out", function(err, reply) {
				reply.should.eql("Two star result foo bar");
				done();
			});
		});

	});

	describe('Alternates Interface (a|b)', function(){
		it("should match a or b - Not empty", function(done) {
			bot.reply("user1", "what is it", function(err, reply) {
				reply.should.eql("");
				done();
			});
		});		

		it("should match a or b - should be A", function(done) {
			bot.reply("user1", "what day is it", function(err, reply) {
				reply.should.eql("Test four should pass");
				done();
			});
		});		

		it("should match a or b - should be B", function(done) {
			bot.reply("user1", "what week is it", function(err, reply) {
				reply.should.eql("Test four should pass");
				done();
			});
		});
	});

	describe('Optionals Interface [a|b|c]', function(){
		it("should match empty case", function(done) {
			bot.reply("user1", "i have a car", function(err, reply) {
				reply.should.eql("Test five should pass");
				done();
			});
		});		

		it("should match a", function(done) {
			bot.reply("user1", "i have a red car", function(err, reply) {
				reply.should.eql("Test five should pass");
				done();
			});
		});

		it("should match b", function(done) {
			bot.reply("user1", "i have a blue car", function(err, reply) {
				reply.should.eql("Test five should pass");
				done();
			});
		});		

		it("should match c", function(done) {
			bot.reply("user1", "i have a green car", function(err, reply) {
				reply.should.eql("Test five should pass");
				done();
			});
		});		

		it("should not match d", function(done) {
			bot.reply("user1", "i have a black car", function(err, reply) {
				reply.should.eql("");
				done();
			});
		});
	});

 	describe('Expand with WordNet', function(){
		it("should reply to simple string", function(done) {
			bot.reply("user1", "I love basketball", function(err, reply) {
				reply.should.eql("Wordnet test one");
				done();
			});
		});
	});	

 	describe('Replies can have Optionals too!', function(){
 		it("replies with optionals", function(done) {
 			bot.reply("user1", "this reply is random", function(err, reply) {
 				["yes this reply is awesome","yes this reply is random"].should.containEql(reply)
 				done();
 			});
 		});

 		it("replies with wordnet", function(done) {
 			bot.reply("user1", "reply with wordnet", function(err, reply) {
 				
 				["i cotton people","i prefer people", "i care for people", "i love people", "i please people"].should.containEql(reply)
 				done();
 			});
 		});

 	});

	describe('Custom functions', function(){
		it("should call a custom function", function(done) {
			bot.reply("user1", "custom function", function(err, reply) {
				reply.should.eql("The Definition of function is perform duties attached to a particular office or place or function");
				done();
			});
		});

		it("should warn if function is missing", function(done) {
			bot.reply("user1", "custom2 function", function(err, reply) {
				console.log(err, reply)
				// reply.should.eql("");
				done();
			});
		});

		it("should continue if error is passed into callback", function(done) {
			bot.reply("user1", "custom3 function", function(err, reply) {
				reply.should.eql("backup plan");
				done();
			});
		});

		it("pass a param into custom function", function(done) {
			bot.reply("user1", "custom5 function", function(err, reply) {
				reply.should.eql("he likes this");
				done();
			});
		});

		it("pass a param into custom function1", function(done) {
			bot.reply("user1", "custom6 function", function(err, reply) {
				["he cottons this","he prefers this", "he cares for this", "he loves this", "he pleases this"].should.containEql(reply)
				done();
			});
		});

		it("should not freak out if function does not exist", function(done) {
			bot.reply("user1", "custom4 function", function(err, reply) {
				reply.should.eql("one + one = 2");
				done();
			});
		});
		


	});
});
