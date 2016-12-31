import _ from 'lodash';
import debuglog from 'debug-levels';
import safeEval from 'safe-eval';

import regexes from './regexes';

const debug = debuglog('SS:Utils');

// TODO: rename to normlize to avoid confusion with string.trim() semantics
/**
 * Remove extra whitespace from a string, while preserving new lines.
 * @param {string} text - the string to tidy up
 */
const trim = (text = '') => text.trim().replace(/[ \t]+/g, ' ');

/**
 * Count the number of real words in a string
 * @param {string} text - the text to count
 * @returns {number} the number of words in `text`
 */
const wordCount = text => text.split(/[\s*#_|]+/).filter(w => w.length > 0).length;

// Checks if any of the values in 'value' are present in 'list'
const inArray = function inArray(list, value) {
  const values = _.isArray(value) ? value : [value];
  return values.some(value => list.indexOf(value) >= 0);
};

const commandsRE = /[\\.+?${}=!:]/g;
const nonCommandsRE = /[\\.+*?^\[\]$(){}=!<>|:]/g;
/**
 * Escape a string sp that it can be used in a regular expression.
 * @param {string}  string   - the string to escape
 * @param {boolean} commands -
 */
const quotemeta = (string, commands = false) => string.replace(commands ? commandsRE : nonCommandsRE, c => `\\${c}`);

const getRandomInt = function getRandomInt(min, max) {
  return Math.floor(Math.random() * ((max - min) + 1)) + min;
};

const pickItem = function pickItem(arr) {
  // TODO - Item may have a wornet suffix meal~2 or meal~n
  const ind = getRandomInt(0, arr.length - 1);
  return _.isString(arr[ind]) ? arr[ind].replace(/_/g, ' ') : arr[ind];
};

const genId = function genId() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 8; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

/**
 * Search each string in `strings` for `<cap>` tags and replace them with values from `caps`.
 *
 * Replacement is positional so `<cap1>` replaces with `caps[1]` and so on, with `<cap>` also
 * replacing from `caps[1]`.
 * Empty `strings` are removed from the result.
 *
 * @param {Array<string>} strings - text to search for `<cap>` tags
 * @param {Array<string>} caps - replacement text
 */
const replaceCapturedText = (strings, caps) => strings
      .filter(s => !_.isEmpty(s))
      .map(s => s.replace(regexes.captures, (m, p1) => caps[Number.parseInt(p1 || 1)]));

const runPluginFunc = async function runPluginFunc(functionRegex, scope, plugins) {
  const pluginFunction = functionRegex.match(regexes.filter);
  const functionName = pluginFunction[1];
  const functionArgs = pluginFunction[2];

  debug.verbose(`Running plugin function with name: ${functionName}`);

  if (!plugins[functionName]) {
    throw new Error(`Plugin function not found: ${functionName}`);
  }

  let cleanArgs = null;
  try {
    cleanArgs = safeEval(`[${functionArgs}]`);
  } catch (err) {
    throw new Error(`Error in plugin function arguments: ${err}`);
  }

  return await new Promise((resolve, reject) => {
    cleanArgs.push((err, ...args) => {
      err ? reject(err) : resolve(args);
    });
    debug.verbose(`Calling plugin function: ${functionName} with args: ${cleanArgs}`);
    plugins[functionName].apply(scope, cleanArgs);
  });
};

export default {
  genId,
  getRandomInt,
  inArray,
  pickItem,
  quotemeta,
  replaceCapturedText,
  runPluginFunc,
  trim,
  wordCount,
};
