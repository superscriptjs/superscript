var script = require("../index");
var sfact = require("sfacts");
var fs = require("fs");
var rmdir = require("rmdir");
var async = require("async");
  
var mongoDB, mongoose, cnet, data, botData;

mongoose = require("mongoose");
cnet = require("conceptnet")({host:'127.0.0.1', user:'root', pass:''});

data = [
  // './test/fixtures/concepts/bigrams.tbl', // Used in Reason tests
  // './test/fixtures/concepts/trigrams.tbl', 
  './test/fixtures/concepts/concepts.top',
  './test/fixtures/concepts/verb.top', 
  './test/fixtures/concepts/color.tbl', 
  './test/fixtures/concepts/opp.tbl'
];

botData = [
  './test/fixtures/concepts/botfacts.tbl',
  './test/fixtures/concepts/botown.tbl'
];

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

  bot.factSystem.db.close(function(){
    // Kill the globals
    gFacts = null;
    bot = null;
    async.each(['./factsystem', './systemDB'], itor,  done);
    
    delete mongoose.connection.models['User'];
    mongoose.connection.models = {};

    mongoDB.connection.db.dropDatabase(function(){
      mongoose.connection.close();
    });
  });  
}


exports.before = function(file) {

  var options = { 
    scope: {
      cnet : cnet
    }
  }

  return function(done) {
    mongoDB = mongoose.connect("mongodb://localhost/userDB");
    fs.exists('./test/fixtures/cache/'+ file +'.json', function (exists) {
      if (!exists) {
        bootstrap(function(err, facts) {
          var parse = require("../lib/parse")(facts);
          parse.loadDirectory('./test/fixtures/' + file, function(err, result) {
            options['factSystem'] = facts;
            fs.writeFile('./test/fixtures/cache/'+ file +'.json', JSON.stringify(result), function (err) {
              new script('./test/fixtures/cache/'+ file +'.json', options, function(err, botx) {
                bot = botx;
                done();
              });
            });
          });
        });
      } else {
        console.log("Loading Cached Script");
        var contents = fs.readFileSync('./test/fixtures/cache/'+ file +'.json', 'utf-8');
        var contents = JSON.parse(contents);
        
        
        bootstrap(function(err, facts) {
          options['factSystem'] = facts;
          options['mongoConnection'] = mongoDB;
          var sums = contents.checksums;
          var parse = require("../lib/parse")(facts);
          parse.loadDirectory('./test/fixtures/' + file, sums, function(err, result) {

            parse.merge(contents, result, function(err, results) {

              fs.writeFile('./test/fixtures/cache/'+ file +'.json', JSON.stringify(results), function (err) {
                facts.createUserDBWithData('botfacts', botData, function(err, botfacts){
                  options['botfacts'] = botfacts;
                  bot = null;            
                  new script('./test/fixtures/cache/'+ file +'.json', options, function(err, botx) {
                    bot = botx;
                    done();
                  });
                });
              });
            });
          });
        });
      }
    });
  }
}
