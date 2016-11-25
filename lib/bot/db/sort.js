'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _utils = require('../utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var debug = (0, _debug2.default)('Sort');

var initSortTrack = function initSortTrack() {
  return {
    qtype: {}, // Sort by Question Types Length
    atomic: {}, // Sort by number of whole words
    option: {}, // Sort optionals by number of words
    alpha: {}, // Sort alpha wildcards by no. of words
    number: {}, // Sort number wildcards by no. of words
    wild: {}, // Sort wildcards by no. of words
    pound: [], // Triggers of just #
    under: [], // Triggers of just _
    star: [] };
};

var sortTriggerSet = function sortTriggerSet(gambits) {
  var gambit = void 0;
  var cnt = void 0;
  var inherits = void 0;

  var lengthSort = function lengthSort(a, b) {
    return b.length - a.length;
  };

  // Create a priority map.
  var prior = {
    0: [] };

  // Sort triggers by their weights.
  for (var i = 0; i < gambits.length; i++) {
    gambit = gambits[i];
    var match = gambit.input.match(/\{weight=(\d+)\}/i);
    var weight = 0;
    if (match && match[1]) {
      weight = match[1];
    }

    if (!prior[weight]) {
      prior[weight] = [];
    }
    prior[weight].push(gambit);
  }

  var sortFwd = function sortFwd(a, b) {
    return b - a;
  };
  var sortRev = function sortRev(a, b) {
    return a - b;
  };

  // Keep a running list of sorted triggers for this topic.
  var running = [];

  // Sort them by priority.
  var priorSort = Object.keys(prior).sort(sortFwd);

  for (var _i = 0; _i < priorSort.length; _i++) {
    var p = priorSort[_i];
    debug('Sorting triggers with priority ' + p);

    // Loop through and categorize these triggers.
    var track = {};

    for (var j = 0; j < prior[p].length; j++) {
      gambit = prior[p][j];

      inherits = -1;
      if (!track[inherits]) {
        track[inherits] = initSortTrack();
      }

      if (gambit.qType) {
        // Qtype included
        cnt = gambit.qType.length;
        debug('Has a qType with ' + gambit.qType.length + ' length.');

        if (!track[inherits].qtype[cnt]) {
          track[inherits].qtype[cnt] = [];
        }
        track[inherits].qtype[cnt].push(gambit);
      } else if (gambit.input.indexOf('*') > -1) {
        // Wildcard included.
        cnt = _utils2.default.wordCount(gambit.input);
        debug('Has a * wildcard with ' + cnt + ' words.');
        if (cnt > 1) {
          if (!track[inherits].wild[cnt]) {
            track[inherits].wild[cnt] = [];
          }
          track[inherits].wild[cnt].push(gambit);
        } else {
          track[inherits].star.push(gambit);
        }
      } else if (gambit.input.indexOf('[') > -1) {
        // Optionals included.
        cnt = _utils2.default.wordCount(gambit.input);
        debug('Has optionals with ' + cnt + ' words.');
        if (!track[inherits].option[cnt]) {
          track[inherits].option[cnt] = [];
        }
        track[inherits].option[cnt].push(gambit);
      } else {
        // Totally atomic.
        cnt = _utils2.default.wordCount(gambit.input);
        debug('Totally atomic trigger and ' + cnt + ' words.');
        if (!track[inherits].atomic[cnt]) {
          track[inherits].atomic[cnt] = [];
        }
        track[inherits].atomic[cnt].push(gambit);
      }
    }

    // Move the no-{inherits} triggers to the bottom of the stack.
    track[0] = track['-1'];
    delete track['-1'];

    // Add this group to the sort list.
    var trackSorted = Object.keys(track).sort(sortRev);

    for (var _j = 0; _j < trackSorted.length; _j++) {
      var ip = trackSorted[_j];
      debug('ip=' + ip);

      var kinds = ['qtype', 'atomic', 'option', 'alpha', 'number', 'wild'];
      for (var k = 0; k < kinds.length; k++) {
        var kind = kinds[k];

        var kindSorted = Object.keys(track[ip][kind]).sort(sortFwd);

        for (var l = 0; l < kindSorted.length; l++) {
          var item = kindSorted[l];
          running.push.apply(running, _toConsumableArray(track[ip][kind][item]));
        }
      }

      // We can sort these using Array.sort
      var underSorted = track[ip].under.sort(lengthSort);
      var poundSorted = track[ip].pound.sort(lengthSort);
      var starSorted = track[ip].star.sort(lengthSort);

      running.push.apply(running, _toConsumableArray(underSorted));
      running.push.apply(running, _toConsumableArray(poundSorted));
      running.push.apply(running, _toConsumableArray(starSorted));
    }
  }
  return running;
};

exports.default = {
  sortTriggerSet: sortTriggerSet
};