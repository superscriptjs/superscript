var script = require("../index");
var sfact = require("sfacts");
var fs = require("fs");
var rmdir = require("rmdir");
var async = require("async");

var data = [
  './test/fixtures/concepts/test.top', 
  './test/fixtures/concepts/opp.tbl'];

exports.bootstrap = bootstrap = function(cb) {
  sfact.load(data, 'factsystem', function(err, facts){
    gFacts = facts;
    cb(null, facts);
  });
}

exports.after = function(done) {

  var itor = function(item, cb) {
    fs.exists(item, function (exists) {
      if (exists) { 
        rmdir(item, cb); 
      } else {
        cb();
      }
    });
  }

  bot.facts.db.close(function(){
    async.each(['./factsystem', './systemDB'], itor,  done);
  });  
}

exports.before = function(file) {
  return function(done) {

    fs.exists('./test/fixtures/cache/'+ file +'.json', function (exists) {
      if (!exists) {
        bootstrap(function(err, facts) {
          var parse = require("../lib/parse")(facts);
          parse.loadDirectory('./test/fixtures/' + file, function(err, result) {
            
            fs.writeFile('./test/fixtures/cache/'+ file +'.json', JSON.stringify(result), function (err) {
              new script('./test/fixtures/cache/'+ file +'.json', { factSystem: facts }, function(err, botx) {
                bot = botx;
                done();
              });
            });

          });
        });
      } else {
        console.log("Loading Cached Script");
        bootstrap(function(err, facts){
         new script('./test/fixtures/cache/'+ file +'.json', { factSystem: facts }, function(err, botx) {
           bot = botx;
           done();
         });
        });
      }
    });
  }
}
