var mocha = require("mocha");
var should  = require("should");

var script = require("../index");
var bot = new script();

describe('Basic Interface', function(){

	it("should have a few functions", function(done){
		bot.reply.should.be.Function;
		bot.parse.should.be.Function;
		bot.loadDirectory.should.be.Function;
		done();
	});
	
});