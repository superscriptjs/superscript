var mocha = require("mocha");
var fs = require("fs");
var should  = require("should");
var script = require("../index");
var rmdir = require("rmdir");
var sfact = require("sfacts");
var bot;

var bootstrap = function(cb) {  
  sfact.load(['./test/fixtures/concepts/test.top'], 'factsystem', function(err, db){
    cb(null, db);
  });
}

describe('SuperScript substitution Interface', function(){

 before(function(done){
  fs.exists('./test/fixtures/cache/substitution.json', function (exists) {
    if (exists) {
      bootstrap(function(err, facts) {
        
        var parse = require("../lib/parse")(facts);
        parse.loadDirectory('./test/fixtures/substitution', function(err, result){
          fs.writeFile('./test/fixtures/cache/substitution.json', JSON.stringify(result), function (err) {
            if (err) throw err;
            new script('./test/fixtures/cache/substitution.json', { factSystem: facts }, function(err, botx) {
              bot = botx;
              done();
            });
          });
        });
      });
    } else {
      console.log("Loading Cached Script");
      bootstrap(function(err, facts){
        new script('./test/fixtures/cache/substitution.json', { factSystem: facts }, function(err, botx) {
          bot = botx;
          done();
        });
      });
    }
  });
 });

  describe('Message Subs', function(){
    it("name subsitution", function(done) {
      bot.reply("user1", "Rob is here", function(err, reply) {
        reply.should.eql("hi Rob");
        done();
      });
    });

    it("name subsitution - 2", function(done) {
      bot.reply("user1", "Rob is taller than Heather", function(err, reply) {
        reply.should.eql("Heather is shorter than Rob");
        done();
      });
    });

    it("name subsitution - 3", function(done) {
      bot.reply("user1", "Rob Ellis is taller than Heather Allen", function(err, reply) {
        reply.should.eql("Heather Allen is shorter than Rob Ellis");
        done();
      });
    });

    it("name subsitution - 4", function(done) {
      bot.reply("user1", "Rob is taller than Rob", function(err, reply) {
        reply.should.eql("");
        done();
      });
    });


    it("verb pronoun noun subsitution ", function(done) {
      bot.reply("user1", "She ran to Vancouver", function(err, reply) {
        reply.should.eql("okay");
        done();
      });
    });
  });  

  after(function(done){
    rmdir("./factsystem", done);
  });

});
