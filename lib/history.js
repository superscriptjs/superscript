var _ = require("underscore");
var debug = require("debug")("History");

// This function walks the history input and looks for utterances previously spoken
// to help answer the or solidify the statement

var historyLookup = function (user, options) {
  debug("History Lookup with", options);
  var i;
  var canidates = [];
  var nn;

  for (i = 0; i < user.__history__.input.length; i++) {
    var pobj = user.__history__.input[i];

    if (pobj !== undefined) {

      // TODO - See why we are getting a nested array.
      if (Array.isArray(pobj)) {
        pobj = pobj[0];
      }

      if (options.numbers || options.number) {
        if (pobj.numbers.length !== 0) {
          canidates.push(pobj);
        }
      }

      // Special case of number
      if (options.money === true && options.nouns) {
        if (pobj.numbers.length !== 0) {

          var t = [];
          if (_.any(pobj.taggedWords, function (item) { return item[1] === "$" || item[0] === "quid" || item[0] === "pounds" || item[0] === "dollars" || item[0] === "bucks" || item[0] === "cost"})) {
            t.push(pobj);

            // Now filter out the nouns
            for (var n = 0; n < t.length; n++) {
              nn = _.any(t[n].nouns, function(item) {
                for(var i = 0; i < options.nouns.length; i++) {
                  return (options.nouns[i] === item) ? true : false;
                }
              });
            }

            if (nn) { canidates.push(pobj); }
          }
        }
      } else if (options.money && pobj) {
        if (pobj.numbers.length !== 0) {
          if (_.any(pobj.taggedWords, function (item) { return item[1] === "$" || item[0] === "quid" || item[0] === "pounds" || item[0] === "dollars" || item[0] === "bucks"})) {
            canidates.push(pobj);
          }
        }
      } else if (options.nouns && pobj) {
        debug("Noun Lookup");
        if (_.isArray(options.nouns)) {
          var s = 0, c = 0;

          nn = _.any(pobj.nouns, function (item) {
            var x = _.contains(options.nouns, item);
            c++;
            s = (x) ? (s + 1) : s;
            return x;
          });

          if (nn) {
            pobj.score = s / c;
            canidates.push(pobj);
          }
        } else {
          if (pobj.nouns.length !== 0) {
            canidates.push(pobj);
          }
        }
      } else if (options.names && pobj) {
        debug("Name Lookup");

        if (_.isArray(options.names)) {
          nn = _.any(pobj.names, function(item){
            return _.contains(options.names, item);
          });
          if (nn) {
            canidates.push(pobj);
          }
        } else {
          if (pobj.names.length !== 0) {
            canidates.push(pobj);
          }
        }
      } else if (options.adjectives && pobj) {
        debug("adjectives Lookup");
        if (_.isArray(options.adjectives)) {
          var s = 0;
          var c = 0;

          nn = _.any(pobj.adjectives, function (item){
            var x = _.contains(options.adjectives, item);
            c++;
            s = (x) ? (s + 1) : s;
            return x;
          });

          if (nn) {
            pobj.score = s / c;
            canidates.push(pobj);
          }
        } else {
          if (pobj.adjectives.length !== 0) {
            canidates.push(pobj);
          }
        }
      }

      if (options.date && pobj) {
        if (pobj.date !== null) {
          canidates.push(pobj);
        }
      }
    }
  }

  return canidates;
};

module.exports = historyLookup;
