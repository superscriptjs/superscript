var natural = require("natural");
var norm = require("node-normalizer");
var fs = require("fs");
var async = require("async");
var _ = require("underscore");
var checksum = require("checksum");
var mergex = require("deepmerge");
var facts = require("sfacts");
var parseContents = require("./parsecontents");
var Utils = require("../utils");

natural.PorterStemmer.attach();

var topics = {};
var gambits = {};
var replys = {};

module.exports = function (factSystem) {
  factSystem = factSystem ? factSystem : facts.create("systemDB");

  var merge = function (part1, part2, cb) {
    var result = {};
    if (!_.isEmpty(part2)) {
      result = mergex(part1, part2);
    } else {
      result = part1;
    }
    cb(null, result);
  };

  var parseFiles = function (factsSystem) {
    return function (fileName, callback) {
      parseContents(norm)(fs.readFileSync(fileName, "utf-8"), factsSystem, callback);
    };
  };

  // A path of files to load
  // Cache is a key:sum of files
  // callback when finished
  var loadDirectory = function (path, cache, callback) {

    var triggerCount = 0;
    var replyCount = 0;

    cache = cache || {};
    if (_.isFunction(cache)) {
      callback = cache;
      cache = {};
    }

    var startTime = new Date().getTime();

    Utils.walk(path, function (err, files) {
      if (err) {
        console.log(err);
      }

      norm.loadData(function () {
        var sums = {};
        var itor = function (file, next) {
          if (file.match(/\.(ss)$/i)) {
            checksum.file(file, function (err4, sum) {
              if (err4) {
                console.log(err4);
              }

              sums[file] = sum;
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
            next(false);
          }
        };

        async.filter(files, itor, function (toLoad) {
          async.map(toLoad, parseFiles(factSystem), function (err4, res) {
            if (err4) {
              console.log(err4);
            }

            for (var i = 0; i < res.length; i++) {
              topics = mergex(topics, res[i].topics);
              gambits = mergex(gambits, res[i].gambits);
              replys = mergex(replys, res[i].replys);
            }

            var data = {
              topics: topics,
              gambits: gambits,
              replys: replys,
              checksums: sums
            };

            var endTime = new Date().getTime();
            var topicCount = Object.keys(topics).length;
            var gambitsCount = Object.keys(gambits).length;
            var replysCount = Object.keys(replys).length;
            console.log("Time to Process", (endTime - startTime) / 1000, "seconds");
            console.log("Number of topics %s parsed.", topicCount);
            console.log("Number of gambits %s parsed.", gambitsCount);
            console.log("Number of replies %s parsed.", replysCount);

            if (data !== "") {
              if (topicCount === 0 && triggerCount === 0 && replyCount === 0) {
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
  };

  return {
    loadDirectory: loadDirectory,
    merge: merge,
    parseFiles: parseFiles,
    parseContents: parseContents(norm)
  };
};
