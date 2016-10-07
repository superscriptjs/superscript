import debuglog from 'debug';
import Utils from '../utils';

const debug = debuglog('Sort');

const initSortTrack = function initSortTrack() {
  return {
    qtype: {}, // Sort by Question Types Length
    atomic: {}, // Sort by number of whole words
    option: {}, // Sort optionals by number of words
    alpha: {}, // Sort alpha wildcards by no. of words
    number: {}, // Sort number wildcards by no. of words
    wild: {}, // Sort wildcards by no. of words
    pound: [], // Triggers of just #
    under: [], // Triggers of just _
    star: [],  // Triggers of just *
  };
};

const sortTriggerSet = function sortTriggerSet(triggers) {
  let trig;
  let cnt;
  let inherits;

  const lengthSort = (a, b) => (b.length - a.length);

  // Create a priority map.
  const prior = {
    0: [], // Default priority = 0
  };

  // Sort triggers by their weights.
  for (let i = 0; i < triggers.length; i++) {
    trig = triggers[i];
    const match = trig.input.match(/\{weight=(\d+)\}/i);
    let weight = 0;
    if (match && match[1]) {
      weight = match[1];
    }

    if (!prior[weight]) {
      prior[weight] = [];
    }
    prior[weight].push(trig);
  }

  const sortFwd = (a, b) => (b - a);
  const sortRev = (a, b) => (a - b);

  // Keep a running list of sorted triggers for this topic.
  const running = [];

  // Sort them by priority.
  const priorSort = Object.keys(prior).sort(sortFwd);

  for (let i = 0; i < priorSort.length; i++) {
    const p = priorSort[i];
    debug(`Sorting triggers with priority ${p}`);

    // Loop through and categorize these triggers.
    const track = {};

    for (let j = 0; j < prior[p].length; j++) {
      trig = prior[p][j];

      inherits = -1;
      if (!track[inherits]) {
        track[inherits] = initSortTrack();
      }

      if (trig.qType !== '') {
        // Qtype included
        cnt = trig.qType.length;
        debug(`Has a qType with ${trig.qType.length} length.`);

        if (!track[inherits].qtype[cnt]) {
          track[inherits].qtype[cnt] = [];
        }
        track[inherits].qtype[cnt].push(trig);
      } else if (trig.input.indexOf('*') > -1) {
        // Wildcard included.
        cnt = Utils.wordCount(trig.input);
        debug(`Has a * wildcard with ${cnt} words.`);
        if (cnt > 1) {
          if (!track[inherits].wild[cnt]) {
            track[inherits].wild[cnt] = [];
          }
          track[inherits].wild[cnt].push(trig);
        } else {
          track[inherits].star.push(trig);
        }
      } else if (trig.input.indexOf('[') > -1) {
        // Optionals included.
        cnt = Utils.wordCount(trig.input);
        debug(`Has optionals with ${cnt} words.`);
        if (!track[inherits].option[cnt]) {
          track[inherits].option[cnt] = [];
        }
        track[inherits].option[cnt].push(trig);
      } else {
        // Totally atomic.
        cnt = Utils.wordCount(trig.input);
        debug(`Totally atomic trigger and ${cnt} words.`);
        if (!track[inherits].atomic[cnt]) {
          track[inherits].atomic[cnt] = [];
        }
        track[inherits].atomic[cnt].push(trig);
      }
    }

    // Move the no-{inherits} triggers to the bottom of the stack.
    track[0] = track['-1'];
    delete track['-1'];

    // Add this group to the sort list.
    const trackSorted = Object.keys(track).sort(sortRev);

    for (let j = 0; j < trackSorted.length; j++) {
      const ip = trackSorted[j];
      debug(`ip=${ip}`);

      const kinds = ['qtype', 'atomic', 'option', 'alpha', 'number', 'wild'];
      for (let k = 0; k < kinds.length; k++) {
        const kind = kinds[k];

        const kindSorted = Object.keys(track[ip][kind]).sort(sortFwd);

        for (let l = 0; l < kindSorted.length; l++) {
          const item = kindSorted[l];
          running.push(...track[ip][kind][item]);
        }
      }

      // We can sort these using Array.sort
      const underSorted = track[ip].under.sort(lengthSort);
      const poundSorted = track[ip].pound.sort(lengthSort);
      const starSorted = track[ip].star.sort(lengthSort);

      running.push(...underSorted);
      running.push(...poundSorted);
      running.push(...starSorted);
    }
  }
  return running;
};

export default {
  sortTriggerSet,
};
