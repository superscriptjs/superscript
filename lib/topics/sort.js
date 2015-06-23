var Utils = require("../utils");
var debug = require("debug")("Sort");

exports.sortTriggerSet = function (triggers) {
  var trig;
  var cnt;
  var i;
  var j;
  var k;
  var l;
  var inherits;

  var lengthSort = function (a, b) {
    return b.length - a.length;
  };

  // Create a priority map.
  var prior = {
    0: [] // Default priority = 0
  };

  // Sort triggers by their weights.
  for (i = 0; i < triggers.length; i++) {
    trig = triggers[i];
    var match = trig.input.match(/\{weight=(\d+)\}/i);
    var weight = 0;
    if (match && match[1]) {
      weight = match[1];
    }

    if (!prior[weight]) {
      prior[weight] = [];
    }
    prior[weight].push(trig);
  }

  var sortFwd = function (a, b) {
    return b - a;
  };

  var sortRev = function (a, b) {
    return a - b;
  };

  // Keep a running list of sorted triggers for this topic.
  var running = [];

  // Sort them by priority.
  var priorSort = Object.keys(prior).sort(sortFwd);

  for (i = 0; i < priorSort.length; i++) {
    var p = priorSort[i];
    debug("Sorting triggers with priority " + p);

    // Loop through and categorize these triggers.
    var track = {};

    for (j = 0; j < prior[p].length; j++) {
      trig = prior[p][j];

      inherits = -1;
      if (!track[inherits]) {
        track[inherits] = initSortTrack();
      }

      if (trig.qType !== "") {
        // Qtype included
        cnt = trig.qType.length;
        debug("Has a qType with " + trig.qType.length + " length.");

        if (!track[inherits].qtype[cnt]) {
          track[inherits].qtype[cnt] = [];
        }
        track[inherits].qtype[cnt].push(trig);

      } else if (trig.input.indexOf("*") > -1) {
        // Wildcard included.
        cnt = Utils.wordCount(trig.input);
        debug("Has a * wildcard with " + cnt + " words.");
        if (cnt > 1) {
          if (!track[inherits].wild[cnt]) {
            track[inherits].wild[cnt] = [];
          }
          track[inherits].wild[cnt].push(trig);
        } else {
          track[inherits].star.push(trig);
        }
      }
      else if (trig.input.indexOf("[") > -1) {
        // Optionals included.
        cnt = Utils.wordCount(trig.input);
        debug("Has optionals with " + cnt + " words.");
        if (!track[inherits].option[cnt]) {
          track[inherits].option[cnt] = [];
        }
        track[inherits].option[cnt].push(trig);
      } else {
        // Totally atomic.
        cnt = Utils.wordCount(trig.input);
        debug("Totally atomic trigger and " + cnt + " words.");
        if (!track[inherits].atomic[cnt]) {
          track[inherits].atomic[cnt] = [];
        }
        track[inherits].atomic[cnt].push(trig);
      }
    }

    // Move the no-{inherits} triggers to the bottom of the stack.
    track[0] = track["-1"];
    delete track["-1"];

    // Add this group to the sort list.
    var trackSorted = Object.keys(track).sort(sortRev);

    for (j = 0; j < trackSorted.length; j++) {
      var ip = trackSorted[j];
      debug("ip=" + ip);

      var kinds = ["qtype", "atomic", "option", "alpha", "number", "wild"];
      for (k = 0; k < kinds.length; k++) {
        var kind = kinds[k];

        var kindSorted = Object.keys(track[ip][kind]).sort(sortFwd);

        for (l = 0; l < kindSorted.length; l++) {
          var item = kindSorted[l];
          running.push.apply(running, track[ip][kind][item]);
        }
      }

      // We can sort these using Array.sort
      var underSorted = track[ip].under.sort(lengthSort);
      var poundSorted = track[ip].pound.sort(lengthSort);
      var starSorted = track[ip].star.sort(lengthSort);

      running.push.apply(running, underSorted);
      running.push.apply(running, poundSorted);
      running.push.apply(running, starSorted);
    }
  }
  return running;
};

var initSortTrack = function () {
  return {
    "qtype": {}, // Sort by Question Types Length
    "atomic": {}, // Sort by number of whole words
    "option": {}, // Sort optionals by number of words
    "alpha": {}, // Sort alpha wildcards by no. of words
    "number": {}, // Sort number wildcards by no. of words
    "wild": {}, // Sort wildcards by no. of words
    "pound": [], // Triggers of just #
    "under": [], // Triggers of just _
    "star": []  // Triggers of just *
  };
};
