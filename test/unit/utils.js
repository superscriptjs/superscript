
var mocha = require("mocha");
var should  = require("should");
var _ = require("underscore");

var Utils = require("../../lib/utils");

describe("Util Helpers", function() {

  it("should not care about sentences with no punct.", function(done){
    var m = Utils.sentensSplit("Hello world");
    m.should.eql([ 'Hello world' ]);
    done()
  });


  it("should simple split.", function(done){
    var m = Utils.sentensSplit("Hello world.");
    m.should.eql([ 'Hello world .' ]);
    done()
  });

  it("should double split.", function(done){
    var m = Utils.sentensSplit("Hello world. Hello wild world.");
    m.should.eql([ 'Hello world .', 'Hello wild world .' ]);
    done()
  });

  it("should indicate article", function(done){
    var m = Utils.indefiniteArticlerize("banana");
    m.should.eql("a banana");

    var m = Utils.indefiniteArticlerize("apple");
    m.should.eql("an apple");

    var m = Utils.indefiniteArticlerize("hour");
    m.should.eql("an hour");

    done()
  });

  it("should indicate article", function(done){
    var m = Utils.indefiniteList(["pear", "banana", "apple"]);
    m.should.eql("a pear, a banana and an apple");
    done()
  });
  
});

