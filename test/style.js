var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe('Super Script Style', function(){

  before(help.before("style"));

  describe('Wrapping lines', function(){
    it("should continue onto the next line", function(done){
      bot.reply("user1", "tell me a poem", function(err, reply) {
        reply.string.should.eql("Little Miss Muffit sat on her tuffet,\nIn a nonchalant sort of way.\nWith her forcefield around her,\nThe Spider, the bounder,\nIs not in the picture today.");
        done();
      });
    });
  });


  describe('Normalize Trigger', function(){
    it("should be expanded before trying to match", function(done){
      bot.reply("user1", "it is all good in the hood", function(err, reply) {
        reply.string.should.eql("normalize trigger test");
        done();
      });
    });   

    it("should be expanded before trying to match contract form", function(done){
      bot.reply("user1", "it's all good in the hood two", function(err, reply) {
        reply.string.should.eql("normalize trigger test");
        done();
      });
    });   
  });

  describe('Mix case test', function(){
    it("should match all capitals", function(done){
      bot.reply("user1", "this is all capitals", function(err, reply) {
        reply.string.should.eql("Test six should pass");
        done();
      });
    });

    it("should match some capitals", function(done){
      bot.reply("user1", "this IS ALL capitals", function(err, reply) {
        reply.string.should.eql("Test six should pass");
        done();
      });
    });

    it("should match with or without puct - 1", function(done){
      bot.reply("user1", "Do you have a clue?", function(err, reply) {
        reply.string.should.eql("Test seven should pass");
        done();
      });
    });

    it("should match with or without puct - 2", function(done){
      bot.reply("user1", "Do you have a cause", function(err, reply) {
        reply.string.should.eql("Test seven should pass");
        done();
      });
    });

    it("should match with extra spaces mixed in", function(done){
      bot.reply("user1", "Do       you       have   a    condition", function(err, reply) {
        reply.string.should.eql("Test seven should pass");
        done();
      });
    });

    it("should allow spaces at the end of replies", function(done){
      bot.reply("user1", "spaced out", function(err, reply) {
        reply.string.should.eql("note the space  ");
        done();
      });
    });


    it("should removed bursted commas", function(done){
      bot.reply("user1", "John is older than Mary, and Mary is older than Sarah", function(err, reply) {
        reply.string.should.eql("Test eight should pass");
        done();
      });
    });


    it("should removed bursted commas 2", function(done){
      bot.reply("user1", "Is it morning, noon, or night?", function(err, reply) {
        reply.string.should.eql("Test nine should pass");
        done();
      });
    });

    it("should removed quotes", function(done){
      bot.reply("user1", 'How many letters in "car"?', function(err, reply) {
        reply.string.should.eql("Test ten should pass");
        done();
      });
    });

  });

  describe("chunk message", function(){
    it("should split the message into two", function(done){
      bot.reply("user1", "My name is Bill. What is your name?", function(err, reply) {
        reply.string.should.eql("My name is jane.");
        done();
      });
    });
  });

  after(help.after);

});