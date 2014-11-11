var Utils   = require("./utils");
var debug   = require("debug")("Sort");
var dWarn   = require("debug")("Sort:Warning");

Sort = function(includes, lineage) {
  this._lineage   = lineage;
  this._includes  = includes;
  this._depth     = 50;
}

Sort.prototype.topic_triggers = function (topic, triglvl, depth, inheritence, inherited) {

  // Initialize default values.
  if (depth == undefined) {
    depth = 0;
  }
  if (inheritence == undefined) {
    inheritence = 0;
  }
  if (inherited == undefined) {
    inherited = 0;
  }

  // Break if we're in too deep.
  if (depth > this._depth) {
    dWarn("Deep recursion while scanning topic inheritence!");
    return;
  }

  // Important info about the depth vs inheritence params to this function:
  // depth increments by 1 each time this function recursively calls itself.
  // inheritence increments by 1 only when this topic inherits another
  // topic.
  //
  // This way, '> topic alpha includes beta inherits gamma' will have this
  // effect:
  //  alpha and beta's triggers are combined together into one matching
  //  pool, and then those triggers have higher priority than gamma's.
  //
  // The inherited option is true if this is a recursive call, from a topic
  // that inherits other topics. This forces the {inherits} tag to be added
  // to the triggers. This only applies when the top topic 'includes'
  // another topic.
  debug("Collecting trigger list for topic " + topic + " (depth="
    + depth + "; inheritence=" + inheritence + "; inherited=" + inherited
    + ")");

  // topic:   the name of the topic
  // triglvl: reference to this._topics or this._thats
  // depth:   starts at 0 and ++'s with each recursion.

  // Collect an array of triggers to return.
  var triggers = [];

  // Get those that exist in this topic directly.
  var inThisTopic = [];
  if (triglvl[topic]) {
    for (var trigger in triglvl[topic]) {
      inThisTopic.push(trigger);
    }
  }

  // Does this topic include others?
  if (this._includes[topic]) {
    // Check every included topic.
    for (var includes in this._includes[topic]) {
      debug("Topic " + topic + " includes " + includes);
      triggers.push.apply(triggers, this.topic_triggers(includes, triglvl, (depth + 1), (inheritence + 1), true));
    }
  }

  // Does this topic inherit others?
  if (this._lineage[topic]) {
    // Check every inherited topic.
    for (var inherits in this._lineage[topic]) {
      debug("Topic " + topic + " inherits " + inherits);
      triggers.push.apply(triggers, this.topic_triggers(inherits, triglvl, (depth + 1), (inheritence + 1), false));
    }
  }

  // Collect the triggers for *this* topic. If this topic inherits any other
  // topics, it means that this topic's triggers have higher priority than
  // those in any inherited topics. Enforce this with an {inherits} tag.
  if (this._lineage[topic] || inherited) {
    for (var i = 0, end = inThisTopic.length; i < end; i++) {
      var trigger = inThisTopic[i];
      debug("Prefixing trigger with {inherits=" + inheritence + "}" + trigger);
      triggers.push.apply(triggers, ["{inherits=" + inheritence + "}" + trigger]);
    }
  } else {
    triggers.push.apply(triggers, inThisTopic);
  }

  return triggers;
};


// Sort a group of triggers in an optimal sorting order.
Sort.prototype._sort_trigger_set = function (triggers) {

  debug("triggers", triggers)
  // Create a priority map.
  var prior = {
    0: [] // Default priority = 0
  };

  // Sort triggers by their weights.
  for (var i = 0, end = triggers.length; i < end; i++) {
    var trig = triggers[i];
    var match  = trig.match(/\{weight=(\d+)\}/i);
    var weight = 0;
    if (match && match[1]) {
      weight = match[1];
    }

    if (!prior[weight]) {
      prior[weight] = [];
    }
    prior[weight].push(trig);
  }

  // Keep a running list of sorted triggers for this topic.
  var running = [];

  // Sort them by priority.
  var prior_sort = Object.keys(prior).sort(function(a,b) { return b - a });
  for (var i = 0, end = prior_sort.length; i < end; i++) {
    var p = prior_sort[i];
    debug("Sorting triggers with priority " + p);

    // So, some of these triggers may include {inherits} tags, if they
    // came from a topic which inherits another topic. Lower inherits
    // values mean higher priority on the stack.
    var inherits = -1;         // -1 means no {inherits} tag
    var highest_inherits = -1; // highest number seen so far

    // Loop through and categorize these triggers.
    var track = {};
    track[inherits] = this._initSortTrack();

    for (var j = 0, jend = prior[p].length; j < jend; j++) {
      var trig = prior[p][j];
      debug("Looking at trigger: " + trig);

      // See if it has an inherits tag.
      var match = trig.match(/\{inherits=(\d+)\}/i);
      if (match && match[1]) {
        inherits = parseInt(match[1]);
        if (inherits > highest_inherits) {
          highest_inherits = inherits;
        }
        debug("Trigger belongs to a topic that inherits other topics. Level=" + inherits);
        trig = trig.replace(/\{inherits=\d+\}/ig, "");
      } else {
        inherits = -1;
      }

      // If this is the first time we've seen this inheritence level,
      // initialize its track structure.
      if (!track[inherits]) {
        track[inherits] = this._initSortTrack();
      }

      if (trig.indexOf("*") > -1) {
        // Wildcard included.
        var cnt = Utils.wordCount(trig);
        debug("Has a * wildcard with " + cnt + " words.");
        if (cnt > 1) {
          if (!track[inherits]['wild'][cnt]) {
            track[inherits]['wild'][cnt] = [];
          }
          track[inherits]['wild'][cnt].push(trig);
        } else {
          track[inherits]['star'].push(trig);
        }
      }
      else if (trig.indexOf("[") > -1) {
        // Optionals included.
        var cnt = Utils.wordCount(trig);
        debug("Has optionals with " + cnt + " words.");
        if (!track[inherits]['option'][cnt]) {
          track[inherits]['option'][cnt] = [];
        }
        track[inherits]['option'][cnt].push(trig);
      }
      else {
        // Totally atomic.
        var cnt = Utils.wordCount(trig);
        debug("Totally atomic trigger and " + cnt + " words.");
        if (!track[inherits]['atomic'][cnt]) {
          track[inherits]['atomic'][cnt] = [];
        }
        track[inherits]['atomic'][cnt].push(trig);
      }
    }

    // Move the no-{inherits} triggers to the bottom of the stack.
    track[ (highest_inherits + 1) ] = track['-1'];
    delete track['-1'];

    // Add this group to the sort list.
    var track_sorted = Object.keys(track).sort(function(a,b) { return a-b });
    for (var j = 0, jend = track_sorted.length; j < jend; j++) {
      var ip = track_sorted[j];
      debug("ip=" + ip);

      var kinds = ["atomic", "option", "alpha", "number", "wild"];
      for (var k = 0, kend = kinds.length; k < kend; k++) {
        var kind = kinds[k];
        var kind_sorted = Object.keys(track[ip][kind]).sort(function(a,b) { return b-a });
        for (var l = 0, lend = kind_sorted.length; l < lend; l++) {
          var item = kind_sorted[l];
          running.push.apply(running, track[ip][kind][item]);
        }
      }

      var under_sorted = track[ip]['under'].sort( function(a,b) { return b.length - a.length });
      var pound_sorted = track[ip]['pound'].sort( function(a,b) { return b.length - a.length });
      var star_sorted  = track[ip]['star'].sort( function(a,b) { return b.length - a.length });

      running.push.apply(running, under_sorted);
      running.push.apply(running, pound_sorted);
      running.push.apply(running, star_sorted);
    }
  }

  return running;
};

// Make a list of sorted triggers that correspond to %Previous groups.
Sort.prototype._sort_that_triggers = function (sortedSet, previous) {
  debug("Sorting reverse triggers for %Previous groups...");

  // (Re)initialize the sort buffer.
  sortedSet["that_trig"] = {};

  for (var topic in previous) {
    if (!sortedSet["that_trig"][topic]) {
      sortedSet["that_trig"][topic] = {};
    }

    for (var bottrig in previous[topic]) {
      if (!sortedSet["that_trig"][topic][bottrig]) {
        sortedSet["that_trig"][topic][bottrig] = [];
      }
      var triggers = this._sort_trigger_set(Object.keys(previous[topic][bottrig]));
      sortedSet["that_trig"][topic][bottrig] = triggers;
    }
  }
  return sortedSet;
};

Sort.prototype._initSortTrack = function () {
  return {
    'atomic': {}, // Sort by number of whole words
    'option': {}, // Sort optionals by number of words
    'alpha':  {}, // Sort alpha wildcards by no. of words
    'number': {}, // Sort number wildcards by no. of words
    'wild':   {}, // Sort wildcards by no. of words
    'pound':  [], // Triggers of just #
    'under':  [], // Triggers of just _
    'star':   []  // Triggers of just *
  };
};

module.exports = Sort;