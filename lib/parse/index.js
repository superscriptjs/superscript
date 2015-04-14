var natural = require('natural');
var norm = require("node-normalizer");
var fs = require("fs");
var path = require("path");
var async = require("async");
var _ = require("underscore");
var checksum = require('checksum');
var mergex = require('deepmerge');
var facts = require("sfacts");
var sort = require("./sort");
var parseContents = require("./parsecontents");

var debug = require("debug")("Parse");
var dWarn = require("debug")("Parse:Warn");

var TfIdf = natural.TfIdf;
natural.PorterStemmer.attach();


var topics = {};
var gambits = {};
var replys = {};

module.exports = function(factSystem) {
  var factSystem = (factSystem) ? factSystem : facts.create("systemDB")

  var merge = function(part1, part2, cb) {
    var result = {};
    if (!_.isEmpty(part2)) {
      result = mergex(part1, part2);
    } else {
      result = part1;
    }
    cb(null, result)
  }

  // A path of files to load
  // Cache is a key:sum of files
  // callback when finished
  var loadDirectory = function(path, cache, callback) {
    var triggerCount = 0;
    var replyCount = 0;

    cache = cache || {};
    if (_.isFunction(cache)) {
      callback = cache;
      cache = {};
    }

    var startTime = new Date().getTime();

    walk(path, function(err, files){
      norm.loadData(function() {

        var toLoad = [];
        var that = this;
        var sums = {}
        var itor = function(file, next) {
          if (file.match(/\.(ss)$/i)) {
            checksum.file(file, function(err, sum){
              sums[file]  = sum;
              if (cache[file]) {
                if (cache[file] !== sum) {
                  next(true);
                } else {
                  next(false);
                }
              } else {
                next(true);
              }
            });
          } else {
            next(false)
          }
        }

        async.filter(files, itor, function(toLoad){
          async.map(toLoad, parseFiles(factSystem), function(err, res) {

            // for (var i = 0; i < res.length; i++) {
            //   topicFlags = mergex(topicFlags, res[i].topicFlags);
            //   gTopics = mergex(gTopics, res[i].gTopics);
            //   gPrevTopics = mergex(gPrevTopics, res[i].gPrevTopics);
            //   gKeywords = mergex(gKeywords, res[i].gKeywords);
            //   triggerCount = triggerCount += res[i].gTriggerCount;
            //   replyCount = replyCount += res[i].gReplyCount;
            // }

            // var data = {
            //   gTopicFlags: topicFlags,
            //   gTopics: gTopics,
            //   gPrevTopics: gPrevTopics,
            //   keywords:gKeywords,
            //   // keywords: JSON.stringify(tfidf),
            //   checksums: sums
            // }

            // var tfidf = new TfIdf();
            // for (var topicName in gKeywords) {
            //   if (gKeywords[topicName] != undefined) {
            //     var kw = gKeywords[topicName].join(" ");
            //     if (kw) {
            //       debug("Adding ", kw , "to doc");
            //       tfidf.addDocument(kw.tokenizeAndStem(), topicName);
            //     }
            //   }
            // }


            for (var i = 0; i < res.length; i++) {
              topics = mergex(topics, res[i].topics);
              gambits = mergex(gambits, res[i].gambits);
              replys = mergex(replys, res[i].replys)
            }

            var data = {
              topics: topics,
              gambits: gambits,
              replys: replys,
              // keywords: JSON.stringify(tfidf),
              checksums: sums
            }
            var endTime = new Date().getTime();
            var topicCount = Object.keys(topics).length;
            var gambitsCount = Object.keys(gambits).length;
            var replysCount = Object.keys(replys).length;
            console.log("Time to Process", (endTime - startTime) / 1000, "seconds");
            console.log("Number of topics %s parsed.", topicCount);
            console.log("Number of gambits %s parsed.", gambitsCount);
            console.log("Number of replies %s parsed.", replysCount);

            if (data !== "") {
              if (topicCount == 0 && triggerCount == 0 && replyCount == 0) {
                callback(null, {});
              } else {
                callback(null, data);
              }

            } else {
              callback(new Error("No data"));
            }
          });
        });
      });
    });
  }

  var parseFiles = function(facts) {
    return function(fileName, callback) {
      parseContents(norm)(fs.readFileSync(fileName, 'utf-8'), facts, callback);
    }
  }

  return {
    loadDirectory: loadDirectory,
    merge : merge,
    parseFiles: parseFiles,
    parseContents: parseContents(norm)
  }
}

var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};