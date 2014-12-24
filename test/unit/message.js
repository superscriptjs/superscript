var mocha = require("mocha");
var should  = require("should");

var norm    = require("node-normalizer");
var qtypes  = require("qtypes");
var cnet    = require("conceptnet")({host:'127.0.0.1', user:'root', pass:''});

var Concepts = require("../../lib/concepts");

var data = ['./data/names.top', 
  './data/affect.top', 
  './data/adverbhierarchy.top', 
  './data/verbhierarchy.top',
  './data/concepts.top'];

var Message = require("../../lib/message");

describe('Message Interface', function(){

  var normalize, questions, concept;

  before(function(done){
     norm.loadData(function(){
      // Why didn't I pass this back in the CB?!?
      normalize = norm;
      new qtypes(function(question) {
        questions = question;

        Concepts.readFiles(data, function(facts) {
          concept = facts;
          done();
        });
      });
     });
   });

  it("should parse names and nouns from message 1", function(done){
    new Message("Rob Ellis and Heather know Ashley, Brooklyn and Sydney.", questions, normalize, cnet, concept, function(mo){
      mo.names.should.be.instanceof(Array).and.have.lengthOf(5);
      mo.nouns.should.be.instanceof(Array).and.have.lengthOf(6);
      done();
    });
  });

  it("should parse names and nouns from message 2 - this pulls names from scripted concepts since they are not NNP's", function(done){
    new Message("heather knows Ashley, brooklyn and sydney.", questions, normalize, cnet, concept, function(mo){
      mo.names.should.be.instanceof(Array).and.have.lengthOf(4);
      done();
    });
  });

  it("should parse names and nouns from message 3 - some NN NN should burst", function(done){
    new Message("My friend steve likes to play tennis", questions, normalize, cnet, concept, function(mo){
      mo.nouns.should.be.instanceof(Array).and.have.lengthOf(3);
      mo.names.should.be.instanceof(Array).and.have.lengthOf(1);
      done();
    });
  });

  it("should have nouns with names filters out (cNouns)", function(done){
    new Message("My friend Bob likes to play tennis", questions, normalize, cnet, concept, function(mo){
      mo.nouns.should.be.instanceof(Array).and.have.lengthOf(3);
      mo.names.should.be.instanceof(Array).and.have.lengthOf(1);
      mo.cNouns.should.be.instanceof(Array).and.have.lengthOf(2);
      done();
    });
  });

  it("should find compare", function(done){
    new Message("So do you like dogs or cats.", questions, normalize, cnet, concept, function(mo){
      mo.qSubType.should.eql("CH");
      done();
    });
  }); 

  it("should find compare words 2", function(done){
    new Message("What is bigger a dog or cat?", questions, normalize, cnet, concept, function(mo){
      mo.qSubType.should.eql("CH"); 
      done();
    });
  }); 

  it("should find context", function(done){
    new Message("They are going on holidays", questions, normalize, cnet, concept, function(mo){
      mo.pnouns.should.have.includeEql("they");
      done();
    });
  }); 

  it("should convert to numeric form 1", function(done){
    new Message("what is one plus twenty-one", questions, normalize, cnet, concept, function(mo){
      mo.numbers.should.eql(["1", "21"]);
      mo.numericExp.should.be.true;
      done();
    });
  }); 

  it("should convert to numeric form 2", function(done){
    new Message("what is one plus three hundred and forty-five", questions, normalize, cnet, concept, function(mo){
      mo.numbers.should.eql(["1", "345"]);
      mo.numericExp.should.be.true;
      done();
    });
  }); 

  it("should convert to numeric form 3", function(done){
    new Message("five hundred thousand and three hundred and forty-five", questions, normalize, cnet, concept, function(mo){
      mo.numbers.should.eql(["500345"]);
      done();
    });
  }); 

  it("should convert to numeric form 4", function(done){
    // This this actually done lower down in the stack. (normalizer)
    var mo = new Message("how much is 1,000,000", questions, normalize, cnet, concept, function(mo){
      mo.numericExp.should.be.false;
      mo.numbers.should.eql(["1000000"]);
      done();
    });
  }); 

  it("should find expression", function(done){
    new Message("one plus one = two", questions, normalize, cnet, concept, function(mo){
      mo.numericExp.should.be.true;
      done();
    });
  }); 

  it("should find Date Obj", function(done){
    new Message("If I was born on February 23  1980 how old am I", questions, normalize, cnet, concept, function(mo){
      mo.date.should.not.be.empty
      done();
    });
  });

  it("should find Concepts", function(done){
    new Message("tell that bitch to fuck off", questions, normalize, cnet, concept, function(mo){
      mo.sentiment.should.eql(-7);
      done();
    });
  });

  it.skip("should find concepts 2", function(done){
    new Message("I watched a movie last week with my brother.", questions, normalize, cnet, concept, function(mo){
      
      done();
    });
  });


});