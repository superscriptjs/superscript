'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _requireDir = require('require-dir');

var _requireDir2 = _interopRequireDefault(_requireDir);

var _debugLevels = require('debug-levels');

var _debugLevels2 = _interopRequireDefault(_debugLevels);

var _common = require('./reply/common');

var _common2 = _interopRequireDefault(_common);

var _connect = require('./db/connect');

var _connect2 = _interopRequireDefault(_connect);

var _factSystem = require('./factSystem');

var _factSystem2 = _interopRequireDefault(_factSystem);

var _chatSystem = require('./chatSystem');

var _chatSystem2 = _interopRequireDefault(_chatSystem);

var _getReply = require('./getReply');

var _getReply2 = _interopRequireDefault(_getReply);

var _import = require('./db/import');

var _import2 = _interopRequireDefault(_import);

var _message = require('./message');

var _message2 = _interopRequireDefault(_message);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = (0, _debugLevels2.default)('SS:SuperScript');

var plugins = [];
var editMode = false;
var scope = {};

var loadPlugins = function loadPlugins(path) {
  try {
    (function () {
      var pluginFiles = (0, _requireDir2.default)(path);

      Object.keys(pluginFiles).forEach(function (file) {
        // For transpiled ES6 plugins with default export
        if (pluginFiles[file].default) {
          pluginFiles[file] = pluginFiles[file].default;
        }

        Object.keys(pluginFiles[file]).forEach(function (func) {
          debug.verbose('Loading plugin: ', path, func);
          plugins[func] = pluginFiles[file][func];
        });
      });
    })();
  } catch (e) {
    console.error('Could not load plugins from ' + path + ': ' + e);
  }
};

var SuperScript = function () {
  function SuperScript() {
    var tenantId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'master';

    _classCallCheck(this, SuperScript);

    this.factSystem = _factSystem2.default.createFactSystemForTenant(tenantId);
    this.chatSystem = _chatSystem2.default.createChatSystemForTenant(tenantId);

    // We want a place to store bot related data
    this.memory = this.factSystem.createUserDB('botfacts');

    this.scope = scope;
    this.scope.bot = this;
    this.scope.facts = this.factSystem;
    this.scope.chatSystem = this.chatSystem;
    this.scope.botfacts = this.memory;

    this.plugins = plugins;
  }

  _createClass(SuperScript, [{
    key: 'importFile',
    value: function importFile(filePath, callback) {
      _import2.default.importFile(this.chatSystem, filePath, function (err) {
        console.log('Bot is ready for input!');
        debug.verbose('System loaded, waiting for replies');
        callback(err);
      });
    }
  }, {
    key: 'getUsers',
    value: function getUsers(callback) {
      this.chatSystem.User.find({}, 'id', callback);
    }
  }, {
    key: 'getUser',
    value: function getUser(userId, callback) {
      this.chatSystem.User.findOne({ id: userId }, callback);
    }
  }, {
    key: 'findOrCreateUser',
    value: function findOrCreateUser(userId, callback) {
      var findProps = { id: userId };
      var createProps = {
        currentTopic: 'random',
        status: 0,
        conversation: 0,
        volley: 0,
        rally: 0
      };

      this.chatSystem.User.findOrCreate(findProps, createProps, callback);
    }

    // Converts msg into a message object, then checks for a match

  }, {
    key: 'reply',
    value: function reply(userId, messageString, callback, extraScope) {
      // TODO: Check if random assignment of existing user ID causes problems
      if (arguments.length === 2 && typeof messageString === 'function') {
        callback = messageString;
        messageString = userId;
        userId = Math.random().toString(36).substr(2, 5);
        extraScope = {};
      }

      debug.log("[ New Message - '%s']- %s", userId, messageString);
      var options = {
        userId: userId,
        extraScope: extraScope
      };

      this._reply(messageString, options, callback);
    }

    // This is like doing a topicRedirect

  }, {
    key: 'directReply',
    value: function directReply(userId, topicName, messageString, callback) {
      debug.log("[ New DirectReply - '%s']- %s", userId, messageString);
      var options = {
        userId: userId,
        topicName: topicName,
        extraScope: {}
      };

      this._reply(messageString, options, callback);
    }
  }, {
    key: 'message',
    value: function message(messageString, callback) {
      var options = {
        factSystem: this.factSystem
      };

      _message2.default.createMessage(messageString, options, function (msgObj) {
        callback(null, msgObj);
      });
    }
  }, {
    key: '_reply',
    value: function _reply(messageString, options, callback) {
      var _this = this;

      var system = {
        // Pass in the topic if it has been set
        topicName: options.topicName || null,
        plugins: this.plugins,
        scope: this.scope,
        extraScope: options.extraScope,
        chatSystem: this.chatSystem,
        factSystem: this.factSystem,
        editMode: editMode
      };

      this.findOrCreateUser(options.userId, function (err, user) {
        if (err) {
          debug.error(err);
        }

        var messageOptions = {
          factSystem: _this.factSystem
        };

        _message2.default.createMessage(messageString, messageOptions, function (messageObject) {
          _common2.default.getTopic(system.chatSystem, system.topicName, function (err, topicData) {
            var options = {
              user: user,
              system: system,
              depth: 0
            };

            if (topicData) {
              options.pendingTopics = [topicData];
            }

            (0, _getReply2.default)(messageObject, options, function (err, replyObj) {
              // Convert the reply into a message object too.
              var replyMessage = '';
              var messageOptions = {
                factSystem: system.factSystem
              };

              if (replyObj) {
                messageOptions.replyId = replyObj.replyId;
                replyMessage = replyObj.string;

                if (replyObj.clearConversation) {
                  messageOptions.clearConversation = replyObj.clearConversation;
                }
              } else {
                replyObj = {};
                console.log('There was no response matched.');
              }

              _message2.default.createMessage(replyMessage, messageOptions, function (replyMessageObject) {
                user.updateHistory(messageObject, replyMessageObject, replyObj, function (err, log) {
                  // We send back a smaller message object to the clients.
                  var clientObject = {
                    replyId: replyObj.replyId,
                    createdAt: replyMessageObject.createdAt || new Date(),
                    string: replyMessage || '', // replyMessageObject.raw || "",
                    topicName: replyObj.topicName,
                    subReplies: replyObj.subReplies,
                    debug: log
                  };

                  var newClientObject = _lodash2.default.merge(clientObject, replyObj.props || {});

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
  }], [{
    key: 'getBot',
    value: function getBot(tenantId) {
      return new SuperScript(tenantId);
    }
  }]);

  return SuperScript;
}();

var defaultOptions = {
  mongoURI: 'mongodb://localhost/superscriptDB',
  importFile: null,
  factSystem: {
    clean: false,
    importFiles: null
  },
  scope: {},
  editMode: false,
  pluginsPath: process.cwd() + '/plugins',
  logPath: process.cwd() + '/logs'
};

/**
 * Setup SuperScript. You may only run this a single time since it writes to global state.
 * @param {Object} options - Any configuration settings you want to use.
 * @param {String} options.mongoURI - The database URL you want to connect to.
 *                 This will be used for both the chat and fact system.
 * @param {String} options.importFile - Use this if you want to re-import your parsed
 *                 '*.json' file. Otherwise SuperScript will use whatever it currently
 *                 finds in the database.
 * @param {Object} options.factSystem - Settings to use for the fact system.
 * @param {Boolean} options.factSystem.clean - If you want to remove everything in the
 *                  fact system upon launch. Otherwise SuperScript will keep facts from
 *                  the last time it was run.
 * @param {Array} options.factSystem.importFiles - Any additional data you want to
 *                import into the fact system.
 * @param {Object} options.scope - Any extra scope you want to pass into your plugins.
 * @param {Boolean} options.editMode - Used in the editor.
 * @param {String} options.pluginsPath - A path to the plugins written by you. This loads
 *                 the entire directory recursively.
 * @param {String} options.logPath - If null, logging will be off. Otherwise writes
 *                 conversation transcripts to the path.
 */
var setup = function setup() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var callback = arguments[1];

  options = _lodash2.default.merge(defaultOptions, options);
  _logger2.default.setLogPath(options.logPath);

  // Uses schemas to create models for the db connection to use
  _factSystem2.default.createFactSystem(options.mongoURI, options.factSystem, function (err) {
    if (err) {
      return callback(err);
    }

    var db = (0, _connect2.default)(options.mongoURI);
    _chatSystem2.default.createChatSystem(db);

    // Built-in plugins
    loadPlugins(__dirname + '/../plugins');

    // For user plugins
    if (options.pluginsPath) {
      loadPlugins(options.pluginsPath);
    }

    // This is a kill switch for filterBySeen which is useless in the editor.
    editMode = options.editMode || false;
    scope = options.scope || {};

    var bot = new SuperScript('master');

    if (options.importFile) {
      return bot.importFile(options.importFile, function (err) {
        return callback(err, bot);
      });
    }
    return callback(null, bot);
  });
};

exports.default = {
  setup: setup
};