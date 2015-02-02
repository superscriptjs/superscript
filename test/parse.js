var mocha = require("mocha");
var should  = require("should");
var mongoose = require("mongoose");

var importFile = require("../lib/topics/import")();
// mongoose.connect("mongodb://localhost/topicDB");

// This is to add some extra functionity to the parse engine.
describe('parse interface', function(){

  it("should import file to topic Data", function(done){
    importFile('./test/fixtures/cache/script.json', function(err, res){
      
      res.should.eql("done");

      done();
    });
  });
});