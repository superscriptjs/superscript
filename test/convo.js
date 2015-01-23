var mocha = require("mocha");
var should  = require("should");
var help = require("./helpers");

describe('Super Script Conversation', function(){

  before(help.before("convo"));

  describe('Volley', function(){
    
    it("should have volley", function(done) {
      bot.reply("user1", "Can you skip rope?", function(err, reply) {
        bot.getUser("user1", function(e, user){
          user.volley.should.eql(0);
          done();          
        });
      });
    });

    it("should have volley 1", function(done) {
      bot.reply("user1", "Can you jump rope?", function(err, reply) {
        bot.getUser("user1", function(e, user){
          user.volley.should.eql(1);
          user.rally.should.eql(1);

          bot.reply("user1", "Have you done it lately?", function(err, reply) {
            bot.getUser("user1", function(e, user){
              user.volley.should.eql(0);
              user.rally.should.eql(0);
              done();
            });
          });
        });        
      });
    });
  });
  
  after(help.after);
});