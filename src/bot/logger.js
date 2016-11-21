import fs from 'fs';
import mkdirp from 'mkdirp';

// The directory to write logs to
let logPath;

const setLogPath = function setLogPath(path) {
  if (path) {
    try {
      mkdirp.sync(path);
      logPath = path;
    } catch (e) {
      console.error(`Could not create logs folder at ${logPath}: ${e}`);
    }
  }
};

const log = function log(message, logName = 'log') {
  if (logPath) {
    const filePath = `${logPath}/${logName}.log`;
    try {
      fs.appendFileSync(filePath, message);
    } catch (e) {
      console.error(`Could not write log to file with path: ${filePath}`);
    }
  }
};

export default {
  log,
  setLogPath,
};
