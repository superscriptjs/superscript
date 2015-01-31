var mocha = require("mocha");
var should  = require("should");


var parse = require("../lib/parse")();

// This is to add some extra functionity to the parse engine.
describe.only('parse interface', function(){

  it("should parse single string", function(done){

    // Lets take a random string and parse it.
    var str = "? This be *~2 random <noun1> to say\n - Say it isn't so";
    var topic = "random";

    parse.parseContents(str, null, function(err, res){
      console.log(JSON.stringify(res, null, 2));
      done();
    });

  });
});