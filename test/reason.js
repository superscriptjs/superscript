var mocha = require("mocha");
var should  = require("should");

var script = require("../index");

var data = [
	'./data/names.top', 
	'./data/affect.top', 
	'./data/adverbhierarchy.top', 
	'./data/verbhierarchy.top',
	'./data/concepts.top'];

var bot = new script({worldData: data});

describe('Super Script Resoning Interface', function(){

 before(function(done){
    bot.loadDirectory("./test/fixtures/reason", function(err, res) {
    	done();
    });
  });

	describe('Math Reasoning', function(){
 		
 		it("should not change the numbers", function(done) {
 			bot.reply("user1", "what is one plus one", function(err, reply) {
 				reply.should.eql("I think it is 2");
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

 		it("should evaluate math expressions 1c", function(done) {
 			bot.reply("user1", "What is 4+2-1?", function(err, reply) {
 				reply.should.eql("I think it is 5");
 				done();
 			});
 		});

 		it("should evaluate math expressions 2", function(done) {
 			bot.reply("user1", "what is half of two times 16", function(err, reply) {
 				reply.should.eql("I think it is 16");
 				done();
 			});
 		});

 		it("should evaluate math expressions 2b", function(done) {
 			bot.reply("user1", "What is seven multiplied by six?", function(err, reply) {
 				reply.should.eql("I think it is 42");
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

 		it("should evaluate math expressions 4b - Divide by Zero", function(done) {
 			bot.reply("user1", "What is 7 divided by 0?", function(err, reply) {
 				reply.should.eql("I think it is Infinity");
 				done();
 			});
 		});
 		

 		it("should evaluate math expressions 5 - Percent", function(done) {
 			bot.reply("user1", "what is 20% of 120", function(err, reply) {
 				reply.should.eql("I think it is 24");
 				done();
 			});
 		});

 		it("should evaluate math expressions 5b - Percent", function(done) {
 			bot.reply("user1", "What is 50 percent of 40?", function(err, reply) {
 				reply.should.eql("I think it is 20");
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

 		it("should evaluate math expressions 7 - Percent", function(done) {
 			bot.reply("user1", "what is half of 8?", function(err, reply) {
 				reply.should.eql("I think it is 4");
 				done();
 			});
 		});

 		it("should evaluate special case 1", function(done) {
 			bot.reply("user1", "What is the Roman Numeral for 100?", function(err, reply) {
 				reply.should.eql("I think it is C");
 				done();
 			});
 		});

 		it.only("should evaluate special case 2", function(done) {
 			bot.reply("user1", "What is 7 in binary?", function(err, reply) {
 				reply.should.eql("I think it is 111");
 				done();
 			});
 		});

 		it("should evaluate special case 2b", function(done) {
 			bot.reply("user1", "What is 255 in hex?", function(err, reply) {
 				reply.should.eql("I think it is ff");
 				done();
 			});
 		});

 		it("should evaluate special case 3", function(done) {
 			bot.reply("user1", "What number is missing: 1 2 ? 4 5", function(err, reply) {
 				reply.should.eql("I think it is 3");
 				done();
 			});
 		});

 		it("should evaluate special case 3b", function(done) {
 			bot.reply("user1", "What comes next in the sequence: 2 4 6 8 10 12?", function(err, reply) {
 				reply.should.eql("I think it is 14");
 				done();
 			});
 		});

 		it("should evaluate special case 3c", function(done) {
 			bot.reply("user1", "What comes next in the sequence: 1 2 4 8 16?", function(err, reply) {
 				reply.should.eql("I think it is 32");
 				done();
 			});
 		});

	});

	describe("Reason 2 - Compare concepts", function(){
		it("should evaluate compare concepts, 2 nouns and 2 oppisite terms", function(done) {
			bot.reply("user1", "If John is taller than Mary, who is the shorter?", function(err, reply) {
				reply.should.eql("mary is shorter than john.");
				done();
			});
		});

		it("should evaluate compare concepts, 2 nouns and 2 non oppisite terms", function(done) {
			bot.reply("user1", "If John is taller than Mary, who is the taller?", function(err, reply) {
				reply.should.eql("john is taller than mary.");
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
				reply.should.eql("mary is older than sarah, if memory serves.");
				bot.reply("user1", "Who is older John or Sarah?", function(err, reply) {
					reply.should.eql("john is older than sarah, if memory serves.");
					done();
				});
			});
		});

		// John is older than Mary, and Mary is older than Sarah. Which of them is the oldest?
		it("should evaluate compare", function(done){
			bot.reply("user1", "John is older than Mary, and Mary is older than Sarah.", function(err, reply) {
				bot.reply("user1", "Which of them is the oldest?", function(err, reply) {
					reply.should.eql("John is the oldest");
					bot.reply("user1", "Travis is now older then John.", function(err, reply) {
						bot.reply("user1", "Which of them is the oldest?", function(err, reply) {
							reply.should.eql("Travis is the oldest");
							done();
						});	
					});
				});
			});
		});

		//John is taller than Mary and Mary is taller than Sue. Who is shorter, John or Sue?
		it("should evaluate compare 2", function(done){
			bot.reply("user1", "John is taller than Mary and Mary is taller than Sue.", function(err, reply) {
				bot.reply("user1", "Who is shorter, John or Sue?", function(err, reply) {
					reply.should.eql("sue is shorter than john, if memory serves.");
					done();
				});
			});
		});

		it("should evaluate compare 3", function(done) {
			bot.reply("user1", "Jane is older than Janet. Who is the youngest?", function(err, reply) {
				reply.should.containEql("janet");
				done();
			});
		});

	});

	describe("Reason 3 - Auto Reply", function(){
		it("should analize statment 1", function(done) {
			bot.reply("user1", "Something random that sits in memory.", function(err, reply) {
				// This hits the statement flow and is filled with some random gambit
				done();
			});
		});

		// Money
		it("should analize and reply", function(done) {
			bot.reply("user1", "A loaf of bread cost 4.50 now.", function(err, reply) {
				bot.reply("user1", "How much is a loaf of bread?", function(err, reply) {
					reply.should.eql("It is 4.50.");
					done();
				});
			});
		});

		// Date
		it("should analize and reply with date", function(done) {
			bot.reply("user1", "My birthday is next month.", function(err, reply) {
				bot.reply("user1", "When is my birthday?", function(err, reply) {
					reply.should.eql("It is in July.");
					done();
				});
			});
		});

		// date.parse("October 4") true
		// date.parse("October") false
		it.skip("should analize and reply with date 3", function(done) {
			bot.reply("user1", "My birthday is on Oct", function(err, reply) {
				bot.reply("user1", "When is my birthday?", function(err, reply) {
					reply.should.eql("It is in October.");
					done();
				});
			});
		});

		// Distance
		it("should analize and reply 3", function(done) {
			bot.reply("user1", "It is 300 miles from here to Kamloops.", function(err, reply) {
				bot.reply("user1", "How far is it to Kamloops?", function(err, reply) {
					reply.should.eql("300");
					done();
				});
			});
		});

		// WHO (basic)
		it("should analize and with HUM 1", function(done) {
			bot.reply("user1", "My daughters name is Sydney.", function(err, reply) {
				bot.reply("user1", "My brothers name is Dustin.", function(err, reply) {
					bot.reply("user1", "What is my daughters name?", function(err, reply) {
						reply.should.eql("Sydney");
						bot.reply("user1", "What is my brothers name?", function(err, reply1) {
							reply1.should.eql("Dustin");
							done();
						});
					});
				});
			});
		});

		it("should analize and with HUM 2", function(done) {
			bot.reply("user1", "My friends names are Steve and Heather", function(err, reply) {
				bot.reply("user1", "Who is my best friend?", function(err, reply) {
					reply.should.eql("Steve?");
					done();
				});
			});
		});

		it("should analize 2", function(done) {
			bot.reply("user1", "What is a hammer?", function(err, reply) {
				// A taxi is a vehicle for hire"
				reply.should.not.eql("");
				done();
			});
		});

		it("should know how to replace pronouns", function(done) {
			bot.reply("user1", "My favorite car is a Tesla", function(err, reply) {
				bot.reply("user1", "What is it?", function(err, reply) {
					["tesla","car"].should.containEql(reply)
					done();
				});
			});
		});

		it("should know how to replace pronouns 2", function(done) {
			bot.reply("user1", "My brother is turning 30 next week", function(err, reply) {
				bot.reply("user1", "How old is he?", function(err, reply) {
					reply.should.eql("he is 30");
					bot.reply("user1", "who was he?", function(err, reply) {
						reply.should.eql("he was your brother");
						done();
					});
				});
			});
		});

		// We have more of these in unit/history
		it("should resolve reason 1", function(done) {
			bot.reply("user1", "I have a brother called Stuart. Who is Stuart?", function(err, reply) {
				reply.should.containEql("brother");
				done();
			});
		});

		it("should resolve reason 1a", function(done) {
			bot.reply("user1", "My mother is called Janet. What is her name?", function(err, reply) {
				reply.should.containEql("Janet");
				done();
			});
		});

		it("should resolve reason 1a2", function(done) {
			bot.reply("user1", "My uncle is called George. Who is George?", function(err, reply) {
				reply.should.containEql("uncle");
				done();
			});
		});


		it("should resolve reason 1b", function(done) {
			bot.reply("user1", "I like to play football. What do I like to do?", function(err, reply) {
				reply.should.containEql("football");
				done();
			});
		});

		it("should resolve reason 1c", function(done) {
			bot.reply("user1", "I have a pear and an apple. What do I have?", function(err, reply) {
				reply.should.containEql("You have a pear and an apple.");
				done();
			});
		});

		it("should resolve reason 1c", function(done) {
			bot.reply("user1", "I am wearing a green shirt. What am I wearing?", function(err, reply) {
				reply.should.containEql("a shirt.");
				done();
			});
		});
		
		it("should resolve reason 1d", function(done) {
			bot.reply("user1", "I have a dog called Rover. What is my dog called?", function(err, reply) {
				reply.should.containEql("Rover");
				done();
			});
		});

		it("should resolve reason 1e", function(done) {
			bot.reply("user1", "I am 42 years old. How old am I?", function(err, reply) {
				reply.should.containEql("42");
				done();
			});
		});

		it("should analize mistake", function(done) {
			bot.reply("user1", "all good-o? ", function(err, reply) {
				reply.should.not.eql("");
				done();
			});
		});

	});

	describe("Concept Resolution", function(){
		// We need concepts
		it("should resolve reason 1a - concept support", function(done) {
			bot.reply("user1", "My parents are John and Susan. What is my mother called?", function(err, reply) {
				reply.should.containEql("Susan");
				done();
			});
		});

		it("should resolve reason 1b - concept support", function(done) {
			bot.reply("user1", "My kids names are Jack and Janice. Who is my daughter?", function(err, reply) {
				reply.should.containEql("Janice");
				done();
			});
		});

		it("should resolve reason 1c - concept support", function(done) {
			bot.reply("user1", "My parents are John and Susan. What is my dads name?", function(err, reply) {
				reply.should.containEql("John");
				done();
			});
		});

		it("should resolve reason 1d - concept support", function(done) {
			bot.reply("user1", "My parents are John and Susan. Who are my parents?", function(err, reply) {
				reply.should.containEql("John and Susan");
				done();
			});
		});

		// TODO - buy blows the call stack?!?
		it("should resolve reason 1e - concept support", function(done) {
			bot.reply("user1", "Where would I find pants?", function(err, reply) {
				reply.should.containEql("department store");
				done();
			});
		});

		it("should resolve reason 1f - concept support", function(done) {
			bot.reply("user1", "what is your favorite color", function(err, reply) {
				reply.should.containEql("red");
				done();
			});
		});

	});
});