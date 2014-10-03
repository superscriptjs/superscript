var mocha = require("mocha");
var should  = require("should");
var moment  = require("moment");

var History = require("../../lib/history");
var Users 	= require("../../lib/users");

var Message = require("../../lib/message");
var norm 		= require("node-normalizer");
var qtypes 	= require("qtypes");
var Concepts = require("../../lib/concepts");
var cnet 		= require("conceptnet")({host:'127.0.0.1', user:'root', pass:''});

describe('History Lookup Interface', function(){

	var user, normalize, q;
	var data = ['./data/names.top'];

	before(function(done){
		norm.loadData(function(){
			normalize = norm;
			new qtypes(function(question) {
				q = question;
				user = Users.findOrCreate("testuser");
	   		Concepts.readFiles(data, function(facts) {
	   			concept = facts;
					done();
	   		});
			});
		});		
	});

	it("simple history recall", function(done){
		new Message("I have two sons", q, normalize, cnet, concept, function(msgObj) {
			user.updateHistory(msgObj, "");
			new Message("How many sons do I have?", q, normalize, cnet, concept, function(msgObj2) {
				var h = History(user, { nouns: msgObj2.nouns} );
				h.length.should.eql(1);
				h[0].numbers[0].should.eql("2");
				done();
			});
		});
	});

	it("money history recall", function(done){
		new Message("I have twenty-five bucks in my wallet", q, normalize, cnet, concept, function(msgObj) {
			new Message("I ate a 3 course meal to days ago, it was amazing.", q, normalize, cnet, concept, function(msgObjx) {

				user.updateHistory(msgObj, "");
				user.updateHistory(msgObjx, "");
				
				new Message("How much money do I have?", q, normalize, cnet, concept, function(msgObj2) {
					var h = History(user, { money: true } );
					
					h.length.should.eql(1);
					h[0].numbers[0].should.eql("25");
					done();
				});
			});
		});
	});

	it("money history recall with noun filter", function(done){
		new Message("A loaf of bread cost $4.50", q, normalize, cnet, concept, function(msgObj) {
			new Message("A good bike cost like $1,000.00 bucks.", q, normalize, cnet, concept, function(msgObjx) {

				user.updateHistory(msgObj, "");
				user.updateHistory(msgObjx, "");
				
				new Message("How much is a loaf of bread?", q, normalize, cnet, concept, function(msgObj2) {
					var h = History(user, { money: true, nouns: msgObj2.nouns } );
					h.length.should.eql(1);
					h[0].numbers[0].should.eql("4.50");
					done();
				});
			});
		});
	});


	it("date history recall", function(done){
		new Message("next month is important", q, normalize, cnet, concept, function(msgObj) {
			user.updateHistory(msgObj, "");
			new Message("When is my birthday?", q, normalize, cnet, concept, function(msgObj2) {
				var h = History(user, { date: true } );
				h.length.should.eql(1);
				// date should be a moment object
				h[0].date.format("MMMM").should.eql("July");
				done();
			});
		});
	});
	
	// Name lookup with QType Resolver (ENTY:sport)
	// My friend Bob likes to play tennis. What game does Bob like to play?
	// What is the name of my friend who likes to play tennis?
	it("memory problem 1", function(done){
		new Message("My friend Bob likes to play tennis.", q, normalize, cnet, concept, function(msgObj) {
			user.updateHistory(msgObj, "");
			new Message("What game does Bob like to play?", q, normalize, cnet, concept, function(msgObj2) {

				// AutoReply ENTY:Sport
				var h = History(user, { nouns: msgObj2.nouns });
				h.length.should.eql(1);
				cnet.resolveFacts(h[0].cNouns, "sport", function(err, res) {
					
					res.length.should.eql(1);
					res[0].should.eql("tennis");

					// update the history with the new msg obj.
					user.updateHistory(msgObj2, "");

					new Message("What is the name of my friend who likes to play tennis?", q, normalize, cnet, concept, function(msgObj3) {
						var h2 = History(user, { nouns: msgObj3.nouns });
						h2.length.should.eql(1);
						h2[0].names[0].should.eql('Bob');
						done();
					});
				});
			});
		});
	});

	// My friend John likes to fish for trout.  What does John like to fish for?
	// What is the name of my friend who fishes for trout?
	it("memory problem 2", function(done){
		new Message("My friend John likes to fish for trout.", q, normalize, cnet, concept, function(msgObj) {
			user.updateHistory(msgObj, "");
			new Message("What does John like to fish for?", q, normalize, cnet, concept, function(msgObj2) {

				var h = History(user, { nouns: msgObj2.nouns });
				h.length.should.eql(1);
				cnet.resolveFacts(h[0].cNouns, "food", function(err, res) {
					res.length.should.eql(2);
					res.should.containEql("fish");
					res.should.containEql("trout");
					new Message("What is the name of my friend who fishes for trout?", q, normalize, cnet, concept, function(msgObj3) {

						var h2 = History(user, { nouns: msgObj3.nouns });
						h2[0].names[0].should.eql('John');
						done();

					});
				});
			});
		});
	});

	// The ball was hit by Bill. What did Bill hit?
	// Who hit the ball?
	it("memory problem 3", function(done){
		new Message("The ball was hit by Jack.", q, normalize, cnet, concept, function(msgObj) {
			user.updateHistory(msgObj, "");
			new Message("What did Jack hit?", q, normalize, cnet, concept, function(msgObj2) {
				var h = History(user, { nouns: msgObj2.nouns });
				h.length.should.eql(1);
				// Answer types is WHAT, the answer is in the cnouns
				h[0].cNouns[0].should.eql("ball");

				// Follow up question: Who hit the ball?
				new Message("Who hit the ball?", q, normalize, cnet, concept, function(msgObj3) {
					// We know this is a HUM:ind, give me a name!
					var h = History(user, { nouns: msgObj3.nouns });
					h[0].names[0].should.eql("Jack");
					done();	
				});
			});
		});
	});


});

