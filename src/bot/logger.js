import fs from 'fs';
import mkdirp from 'mkdirp';

class Logger {
  constructor(logPath) {
    if (logPath) {
      try {
        mkdirp.sync(logPath);
        this.logPath = logPath;
      } catch (e) {
        console.error(`Could not create logs folder at ${logPath}: ${e}`);
      }
    }
  }

  log(message, logName = 'default') {
    if (this.logPath) {
      const filePath = `${this.logPath}/${logName}.log`;
      try {
        fs.appendFileSync(filePath, message);
      } catch (e) {
        console.error(`Could not write log to file with path: ${filePath}`);
      }
    }
  }
}

export default Logger;
