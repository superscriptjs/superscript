var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

// Testing topics that include and mixin other topics.
describe('Super Script Topic Hooks', function(){

  before(help.before("topichooks"));

  describe('Pre/Post Topic Hooks', function() {
    it("pre topic should be called", function(done) {
      bot.topicSystem.topic.findOne({name:'__pre__'}, function(err, res){
        res.gambits.should.have.lengthOf(1)
        done();
      });
    });

    it("post topic should be called", function(done) {  
      bot.topicSystem.topic.findOne({name:'__post__'}, function(err, res){
        res.gambits.should.have.lengthOf(1)
        done();
      });
    });

    it("normal topic should be called", function(done) {
      bot.topicSystem.topic.findOne({name:'random'}, function(err, res){
        res.gambits.should.have.lengthOf(1)
        done();
      });
    });
  });

  after(help.after);

});