import _ from 'lodash';
import requireDir from 'require-dir';
import debuglog from 'debug-levels';

import Utils from './utils';
import processHelpers from './reply/common';
import connect from './db/connect';
import createFactSystem from './factSystem';
import createChatSystem from './chatSystem';
import getReply from './getReply';
import Importer from './db/import';
import Message from './message';

const debug = debuglog('SS:SuperScript');

class SuperScript {
  /**
   * Creates a new SuperScript instance. Since SuperScript doesn't use global state,
   * you may have multiple instances at once.
   * @param {Object} options - Any configuration settings you want to use.
   * @param {String} options.URL - The database URL you want to connect to.
   * @param {String} options.factSystemName - The name you want to give to the fact system created.
   */
  constructor(options) {
    // Create a new database connection
    this.db = connect(options.mongoURI, options.mongoDB);

    this.plugins = [];

    // For user plugins
    Utils.mkdirSync('../plugins');
    this.loadPlugins('../plugins');
    // Built-in plugins
    this.loadPlugins(`${__dirname}/../plugins`);

    // This is a kill switch for filterBySeen which is useless in the editor.
    this.editMode = options.editMode || false;
  }

  importFile(filePath, callback) {
    Importer.importFile(this.chatSystem, filePath, (err) => {
      console.log('Bot is ready for input!');
      debug.verbose('System loaded, waiting for replies');
      callback(err);
    });
  }

  loadPlugins(path) {
    const plugins = requireDir(path);

    for (const file in plugins) {
      // For transpiled ES6 plugins
      if (plugins[file].default) {
        plugins[file] = plugins[file].default;
      }

      for (const func in plugins[file]) {
        debug.verbose('Loading plugin: ', path, func);
        this.plugins[func] = plugins[file][func];
      }
    }
  }

  getUsers(callback) {
    this.chatSystem.User.find({}, 'id', callback);
  }

  getUser(userId, callback) {
    this.chatSystem.User.findOne({ id: userId }, callback);
  }

  findOrCreateUser(userId, callback) {
    const findProps = { id: userId };
    const createProps = {
      currentTopic: 'random',
      status: 0,
      conversation: 0,
      volley: 0,
      rally: 0,
    };

    this.chatSystem.User.findOrCreate(findProps, createProps, callback);
  }

  // Converts msg into a message object, then checks for a match
  reply(userId, messageString, callback, extraScope) {
    // TODO: Check if random assignment of existing user ID causes problems
    if (arguments.length === 2 && typeof messageString === 'function') {
      callback = messageString;
      messageString = userId;
      userId = Math.random().toString(36).substr(2, 5);
      extraScope = {};
    }

    debug.log("[ New Message - '%s']- %s", userId, messageString);
    const options = {
      userId,
      extraScope,
    };

    this._reply(messageString, options, callback);
  }

  // This is like doing a topicRedirect
  directReply(userId, topicName, messageString, callback) {
    debug.log("[ New DirectReply - '%s']- %s", userId, messageString);
    const options = {
      userId,
      topicName,
      extraScope: {},
    };

    this._reply(messageString, options, callback);
  }

  message(messageString, callback) {
    const options = {
      factSystem: this.factSystem,
    };

    Message.createMessage(messageString, options, (msgObj) => {
      callback(null, msgObj);
    });
  }

  _reply(messageString, options, callback) {
    const system = {
      // Pass in the topic if it has been set
      topicName: options.topicName || null,
      plugins: this.plugins,
      scope: this.scope,
      extraScope: options.extraScope,
      chatSystem: this.chatSystem,
      factSystem: this.factSystem,
      editMode: this.editMode,
    };

    this.findOrCreateUser(options.userId, (err, user) => {
      if (err) {
        debug.error(err);
      }

      const messageOptions = {
        factSystem: this.factSystem,
      };

      Message.createMessage(messageString, messageOptions, (messageObject) => {
        processHelpers.getTopic(system.chatSystem, system.topicName, (err, topicData) => {
          const options = {
            user,
            system,
            depth: 0,
          };

          if (topicData) {
            options.pendingTopics = [topicData];
          }

          getReply(messageObject, options, (err, replyObj) => {
            // Convert the reply into a message object too.
            let replyMessage = '';
            const messageOptions = {
              factSystem: system.factSystem,
            };

            if (replyObj) {
              messageOptions.replyId = replyObj.replyId;
              replyMessage = replyObj.string;

              if (replyObj.clearConvo) {
                messageOptions.clearConvo = replyObj.clearConvo;
              }
            } else {
              replyObj = {};
              console.log('There was no response matched.');
            }

            Message.createMessage(replyMessage, messageOptions, (replyMessageObject) => {
              user.updateHistory(messageObject, replyMessageObject, replyObj, (err, log) => {
                // We send back a smaller message object to the clients.
                const clientObject = {
                  replyId: replyObj.replyId,
                  createdAt: replyMessageObject.createdAt || new Date(),
                  string: replyMessage || '', // replyMessageObject.raw || "",
                  topicName: replyObj.topicName,
                  subReplies: replyObj.subReplies,
                  debug: log,
                };

                const newClientObject = _.merge(clientObject, replyObj.props || {});

                debug.verbose("Update and Reply to user '%s'", user.id, replyObj.string);
                debug.info("[ Final Reply - '%s']- '%s'", user.id, replyObj.string);

                return callback(err, newClientObject);
              });
            });
          });
        });
      });
    });
  }
}

const defaultOptions = {
  mongoURI: 'mongodb://localhost/',
  mongoDB: 'superscriptDB',
  importFile: null,
  factSystem: {
    name: 'botFacts',
    clean: false,
    importData: null,
  },
  scope: {},
  editMode: false,
};

const create = function create(options = {}, callback) {
  options = _.merge(defaultOptions, options);
  const bot = new SuperScript(options);

  // Uses schemas to create models for the db connection to use
  createFactSystem(options.factSystem, (err, factSystem) => {
    if (err) {
      return callback(err);
    }

    bot.factSystem = factSystem;
    bot.chatSystem = createChatSystem(bot.db, bot.factSystem);

    // We want a place to store bot related data
    bot.memory = bot.factSystem.createUserDB('botfacts');

    bot.scope = {};
    bot.scope = _.extend(options.scope || {});
    bot.scope.bot = bot;
    bot.scope.facts = bot.factSystem;
    bot.scope.chatSystem = bot.chatSystem;
    bot.scope.botfacts = bot.memory;

    if (options.importFile) {
      return bot.importFile(options.importFile, err => callback(err, bot));
    }
    return callback(null, bot);
  });
};

export default create;
