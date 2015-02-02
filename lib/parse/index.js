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


var topicFlags = {};
var gTopics = {};
var gPrevTopics = {};
var gSorted = {};
var gKeywords = {};

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

            for (var i = 0; i < res.length; i++) {
              topicFlags = mergex(topicFlags, res[i].topicFlags);
              gTopics = mergex(gTopics, res[i].gTopics);
              gPrevTopics = mergex(gPrevTopics, res[i].gPrevTopics);
              gKeywords = mergex(gKeywords, res[i].gKeywords);
              triggerCount = triggerCount += res[i].gTriggerCount;
              replyCount = replyCount += res[i].gReplyCount;
            }

            sortReplies();

            var tfidf = new TfIdf();
            for (var topicName in gKeywords) {
              if (gKeywords[topicName] != undefined) {
                var kw = gKeywords[topicName].join(" ");
                if (kw) {
                  debug("Adding ", kw , "to doc");
                  tfidf.addDocument(kw.tokenizeAndStem(), topicName);
                }
              }
            }

            var data = {
              gTopicFlags: topicFlags,
              gTopics: gTopics,
              gPrevTopics: gPrevTopics,
              gSorted: gSorted,
              keywords: JSON.stringify(tfidf),
              checksums: sums
            }

            var endTime = new Date().getTime();
            var topicCount = Object.keys(topicFlags).length;
            console.log("Time to Process", (endTime - startTime) / 1000, "seconds");
            console.log("Number of topics %s parsed.", topicCount);
            console.log("Number of triggers %s parsed.", triggerCount);
            console.log("Number of replies %s parsed.", replyCount);

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

var sortReplies = function(thats) {

  var triglvl, sortlvl;
  if (thats !== undefined) {
    debug("Sorting Previous Topics");
    triglvl = gPrevTopics;
    sortlvl = 'thats';
  } else {
    debug("Sorting Topics");
    triglvl = gTopics;
    sortlvl = 'topics';
  }

  // (Re)initialize the sort cache.
  gSorted[sortlvl] = {};
  debug("Sorting triggers...");

  var sorter = new Sort(gTopics, gPrevTopics, {}, {});

  for (var topic in triglvl) {
    debug("Analyzing topic " + topic);

    var alltrig = sorter.topicTriggers(topic, triglvl);
    // debug("ALLTRIG", alltrig, triglvl);
    var running = sorter._sortTriggerSet(alltrig);

    // Save this topic's sorted list.
    if (!gSorted[sortlvl]) {
      gSorted[sortlvl] = {};
    }

    gSorted[sortlvl][topic] = running;
  }

  // And do it all again for %Previous!
  if (thats == undefined) {
    // This will set the %Previous lines to best match the bot's last reply.
    sortReplies(true);

    // If any of the %Previous's had more than one +Trigger for them,
    // this will sort all those +Triggers to pair back to the best human
    // interaction.
    gSorted = sorter.sortPrevTriggers(gSorted, gPrevTopics);
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