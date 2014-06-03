var mocha = require("mocha");
var should  = require("should");

var FactSystem = require("../../lib/factSystem");

describe('Fact Interface', function(){

	var facts;

	before(function(done){
		facts = new FactSystem();
		done();
	})

	it("should work", function(done){
		facts.createfact("Mary", "Bigger", "Sarah", true);
		
		facts.query("direct_svo", "Mary", "Bigger", "Sarah").should.be.true;
		facts.query("direct_svo", "Sarah", "Bigger", "Mary").should.be.false; // false Rel is bigger_op
		facts.query("direct_svo", "Sarah", "bigger_op", "Mary").should.be.true;

		
		done()
	});

});