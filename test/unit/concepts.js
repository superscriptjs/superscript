var mocha = require("mocha");
var should  = require("should");

// Concepts is one layer higher up then Facts.
// Or you can think of a concept as an collection of Facts
var Concepts = require("../../lib/concepts");
var expert  = require("expert");

var data = [
  './test/fixtures/concepts/test.top',
  './test/fixtures/concepts/verb.top',
  './data/concepts.top'
]

describe('Concept Interface', function(){

  var concept;

  before(function(done){
    Concepts.readFiles(data, function(facts) {
      concept = facts;
      done();
    });
  });


  it.only("should find meals", function(done){
    // var x = concept.query("direct_sv","jeans", "isa");
    // console.log(x);
    // done();
    concept.highLevelLookup("breakfast", function(err, hlc) {
      console.log(hlc)
      // hlc[0].hlc.should.have.length(2);
      // var x = concept.query("direct_sv","breakfast", "isa")
      var x = concept.query("direct_sv","meal", "example")
      console.log(x)
      done();
    });
  });


  it("should find brother", function(done){
    concept.highLevelLookup("brother", function(err, hlc) {
      hlc[0].hlc.should.have.length(2);
      concept.query("direct_sv","bro", "isa").should.containEql("brother");
      done();
    });
  });

  it("should find own", function(done){
    concept.highLevelLookup("own", function(err, hlc) {
      hlc[0].hlc.should.have.length(2);
      // Bridge: possess ==> own ==> do_with_titles
      console.log(concept.query("direct_sv","retain", "isa" ))
      done();
    });
  });

  it("should work", function(done){
    // concepts Test
    var language = "espanol";
    var lang = concept.query("direct_sv", language, "languagename");
    lang[0].should.eql(language);

    // What language is spoken in "Spain"
    // ^createfact(^language member ~languages)
    // table: ~geofact  (^country ^language ) 
    // ^createfact(^language member ~languages)
    // ^createfact(^language language ^country)

    // console.log(concept.query("direct_s", "spain"));
    // console.log("language_op", concept.query("direct_sv", "spain", "language_op"));
    // console.log("part_op", concept.query("direct_sv", "spain", "part_op"));
    // console.log("part", concept.query("direct_vo",  "part", "spain"));
    // console.log("adjacent", concept.query("direct_sv", "spain", "adjacent"));
    // console.log("nationality_op", concept.query("direct_sv", "spain", "nationality_op"));
    // console.log("member", concept.query("direct_sv", "spain", "member"));
    // console.log("exchange_rate_op", concept.query("direct_sv", "spain", "exchange_rate_op"));
    

    // List of Languages
    // console.log("languages", concept.query("direct_sv", "languages", "member_op"));

    // console.log(concept.concepts)
    // console.log("States", concept.query("direct_sv", "state", "member_op"));
    // Capitals
    // console.log("Capitals", concept.query("direct_sv", "capital", "member_op"));
    // console.log("Capitals", concept.query("direct_sv", "ottawa", "part"));
    // console.log("Capitals", concept.query("direct_sv", "canada", "part_op"));

    console.log("XX", concept.query("direct_sv", "rome", "part"));
    console.log("XX", concept.query("direct_sv", "ottawa", "part"));
    console.log("XX", concept.query("direct_sv", "ottawa", "part"));
    // console.log("XX", concept.query("direct_sv", "rome", "part_op"));
    // console.log("XX", concept.query("direct_sv", "rome", "member"));


    // console.log("Topics", concept.query("direct_s", "United States of America"));
    // console.log("part_op aka Capital", concept.query("direct_sv", "United States of America", "part_op"));
    // console.log("part", concept.query("direct_vo", "part", "United States of America"));
    // console.log("adjacent", concept.query("direct_sv", "United States of America", "adjacent_op"));
    
    
    done()
  });
});




