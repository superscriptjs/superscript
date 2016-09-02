var mocha = require("mocha");
var should  = require("should");

var utils = require("../../lib/utils");

describe("Util Helpers", function() {

  it("should not care about sentences with no punctuation", function() {
    utils.sentenceSplit("Hello world").should.eql([ 'Hello world' ])
  });

  it("should simple split", function() {
    utils.sentenceSplit("Hello world.").should.eql([ 'Hello world .' ])
  });

  it("should double split", function() {
    utils.sentenceSplit("Hello world. Hello wild world.").should.eql([ 'Hello world .', 'Hello wild world .' ])
  });

  it("should indicate article", function() {
    utils.indefiniteArticlerize("banana").should.equal("a banana")
    utils.indefiniteArticlerize("apple").should.equal("an apple")
    utils.indefiniteArticlerize("hour").should.equal("an hour")
  });

  it("should indicate article", function() {
    utils.indefiniteList(["pear", "banana", "apple"]).should.eql("a pear, a banana and an apple")
  });

  it('should escape mustaches', function() {
    utils.quotemeta('hello{world}', true).should.equal('hello\\{world\\}')
    utils.quotemeta('hello{world}', false).should.equal('hello\\{world\\}')
  })

  it('should only escape pipes when not in commands mode', function() {
    utils.quotemeta('hello|world', true).should.equal('hello|world')
    utils.quotemeta('hello|world', false).should.equal('hello\\|world')
  })

  it('should trim space from string', function() {
    utils.trim('  hello \t\tworld ').should.equal('hello world')
  })

  it('should preserve newlines in strings', function() {
    utils.trim('  hello \n  world ').should.equal('hello \n world')
  })

  it('should count words', function() {
    utils.wordCount('hello_world#this is a very*odd*string').should.equal(8)
  })

  it('should replace captured text', function() {
    const parts = ['hello <cap>', '', 'how are you <cap2> today', '<cap1>, meet <cap3>']
    const stars = ['', 'Dave', 'feeling', 'Sally']
    const replaced = utils.replaceCapturedText(parts, stars)
    replaced.length.should.equal(3)
    replaced[0].should.equal('hello Dave')
    replaced[1].should.equal('how are you feeling today')
    replaced[2].should.equal('Dave, meet Sally')
  })

});

