var mocha = require("mocha");
var should  = require("should");

var norm 		= require("node-normalizer");
var qtypes 	= require("qtypes");

var Message = require("../../lib/message");

describe('Message Interface', function(){

	var normalize, questions;

	before(function(done){
	   norm.loadData(function(){
	   	// Why didn't I pass this back in the CB?!?
	   	normalize = norm;
	   	new qtypes(function(question) {
	   		questions = question;
				done();
	   	});
	   });
	 });

	it("should parse names and nouns from message 1", function(done){
		var mo = new Message("Rob Ellis and Heather know Ashley, Brooklyn and Sydney.", questions, normalize);
		mo.names.should.be.instanceof(Array).and.have.lengthOf(5);
		mo.nouns.should.be.instanceof(Array).and.have.lengthOf(5);
		done()
	});

	it("should parse names and nouns from message 2", function(done){
		var mo = new Message("Rob visited the eiffel tower last November.", questions, normalize);
		mo.nouns.should.have.includeEql("eiffel tower");
		done()
	});	

	it("should find compare", function(done){
		var mo = new Message("So do you like dogs or cats.", questions, normalize);
		mo.thisOrThat.should.be.ok;
		done()
	});	

	it("should find compare words 2", function(done){
		var mo = new Message("What is bigger a dog or cat?", questions, normalize);
		mo.thisOrThat.should.be.ok;
		done()
	});	

	it("should find context", function(done){
		var mo = new Message("They are going on holidays", questions, normalize);
		mo.pnouns.should.have.includeEql("they");
		done()
	});	

	it("should convert to numeric form 1", function(done){
		var mo = new Message("what is one plus twenty-one", questions, normalize);
		mo.clean.should.eql("what is 1 plus 21");
		mo.numericExp.should.be.true;
		done()
	});	

	it("should convert to numeric form 2", function(done){
		var mo = new Message("what is one plus three hundred and forty-five", questions, normalize);
		mo.clean.should.eql("what is 1 plus 345");
		mo.numericExp.should.be.true;
		done()
	});	

	it("should convert to numeric form 3", function(done){
		var mo = new Message("five hundred thousand and three hundred and forty-five", questions, normalize);
		mo.clean.should.eql("500345");
		done()
	});	

	it("should convery to numeric form 4", function(done){
		// This this actually done lower down in the stack. (normalizer)
		var mo = new Message("how much is 1,000,000", questions, normalize);
		mo.numericExp.should.be.false;
		mo.clean.should.eql("how much is 1000000")
		done()
	});	

	it("should find expression", function(done){
		var mo = new Message("one plus one = two", questions, normalize);
		mo.numericExp.should.be.true;
		mo.clean.should.eql("1 plus 1 = 2");
		done()
	});	

});