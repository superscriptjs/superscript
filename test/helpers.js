/* global gFacts:true, bot:true, Promise */

var script = require("../index");
var sfact = require("sfacts");
var fs = require("fs");
var rmdir = require("rmdir");
var async = require("async");
var mongoose = require("mongoose");
var mergex = require("deepmerge");

var cnet, data, botData, bootstrap;

// This is used just for some tests in reason.
// cnet = require("conceptnet")({host:'127.0.0.1', user:'root', pass:''});

data = [
  // './test/fixtures/concepts/bigrams.tbl', // Used in Reason tests
  // './test/fixtures/concepts/trigrams.tbl',
  // './test/fixtures/concepts/concepts.top',
  // './test/fixtures/concepts/verb.top',
  // './test/fixtures/concepts/color.tbl',
  // './test/fixtures/concepts/opp.tbl'
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
};

var removeModel = function(name) {
  return new Promise(function(resolve, reject){
    mongoose.connection.models[name].remove(function(error, removed) {
      if(error) {
        return reject(error);
      }
      delete mongoose.connection.models[name];
      resolve(removed);
    });
  });
};

exports.after = function(end) {

  var itor = function(item, next) {
    fs.exists(item, function (exists) {
      if (exists) {
        rmdir(item, next);
      } else {
        next();
      }
    });
  };
  if (bot) {
    bot.factSystem.db.close(function(){
      // Kill the globals
      gFacts = null;
      bot = null;
      async.each(['./factsystem', './systemDB'], itor, function(){
        Promise.all(Object.keys(mongoose.connection.models).map(removeModel)).then(function(){
          end();
        }, function(error) {
          console.log(error.trace);
          throw error;
        });
        //mongoose.connection.models = {};
        //mongoose.connection.db.dropDatabase();
        //end();
      });
    });
  } else {
    end();
  }

};

var importFilePath = function(path, facts, callback) {
  if(!mongoose.connection.readyState) {
    mongoose.connect('mongodb://localhost/superscriptDB');
  }
  var TopicSystem = require("../lib/topics/index")(mongoose, facts);
  TopicSystem.importerFile(path, callback);

  // This is here in case you want to see what exactly was imported.
  // TopicSystem.importerFile(path, function () {
  //   Topic.find({name: 'random'}, "gambits")
  //     .populate("gambits")
  //     .exec(function (err, mgambits) {
  //     console.log("------", err, mgambits);
  //     callback();
  //   });
  // });

};

exports.before = function(file) {

  var options = {
    chunking: true,
    scope: {
      cnet : cnet
    }
  };

  return function(done) {
    var fileCache = './test/fixtures/cache/'+ file +'.json';
    fs.exists(fileCache, function (exists) {

      if (!exists) {
        bootstrap(function(err, facts) {
          var parse = require("ss-parser")(facts);
          parse.loadDirectory('./test/fixtures/' + file, function(err, result) {
            options.factSystem = facts;
            options.mongoose = mongoose;

            fs.writeFile(fileCache, JSON.stringify(result), function (err) {
              // Load the topic file into the MongoDB
              importFilePath(fileCache, facts, function() {
                new script(options, function(err, botx) {
                  bot = botx;
                  done();
                });
              });
            });
          });
        });
      } else {
        console.log("Loading Cached Script");
        var contents = fs.readFileSync(fileCache, 'utf-8');
        contents = JSON.parse(contents);

        bootstrap(function(err, facts) {
          options.factSystem = facts;
          options.mongoose   = mongoose;

          var sums = contents.checksums;
          var parse = require("ss-parser")(facts);
          var start = new Date().getTime();
          var results;

          parse.loadDirectory('./test/fixtures/' + file, sums, function(err, result) {
            results = mergex(contents, result);
            fs.writeFile(fileCache, JSON.stringify(results), function (err) {
              // facts.createUserDBWithData('botfacts', botData, function(err, botfacts){
                // options.botfacts = botfacts;
                bot = null;
                importFilePath(fileCache, facts, function() {
                  new script(options, function(err, botx) {
                    bot = botx;
                    done();
                  }); // new bot
                }); // import file
              // }); // create user
            }); // write file
          }); // Load files to parse
        });
      }
    });
  };
};
