var mocha = require("mocha");
var should  = require("should");

var wordnet = require("../lib/wordnet");


describe('Wordnet Interface', function(){

	it("should have have a lookup function", function(done){
		wordnet.lookup.should.be.Function;
		wordnet.explore.should.be.Function;
		done()
	});
	
	it("should have have perform lookup", function(done){
		wordnet.lookup("like", "@", function(err, results){
			should.not.exist(err);
			results.should.not.be.empty;
			results.should.have.length(3);
			done();
		});
	});

	it("should refine to POS ", function(done){
		wordnet.lookup("like~v", "@", function(err, results){
			should.not.exist(err);
			results.should.not.be.empty;
			results.should.have.length(2)
			done();
		});
	});


	// not sure how I want to test this yet
	// it("should refine to POS ", function(done){
	// 	wordnet.explore("job", function(err, results){			
	// 		done();
	// 	});
	// });


});