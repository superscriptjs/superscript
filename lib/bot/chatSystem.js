'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _gambit = require('./db/models/gambit');

var _gambit2 = _interopRequireDefault(_gambit);

var _reply = require('./db/models/reply');

var _reply2 = _interopRequireDefault(_reply);

var _topic = require('./db/models/topic');

var _topic2 = _interopRequireDefault(_topic);

var _user = require('./db/models/user');

var _user2 = _interopRequireDefault(_user);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
  I want to create a more organic approach to authoring new gambits, topics and replies.
  Right now, the system parses flat files to a intermediate JSON object that SS reads and
  creates an in-memory topic representation.

  I believe by introducing a Topic DB with a clean API we can have a faster more robust authoring
  expierence parseing input will become more intergrated into the topics, and Im propising
  changing the existing parse inerface with a import/export to make sharing SuperScript
  data (and advanced authoring?) easier.

  We also want to put more focus on the Gambit, and less on topics. A Gambit should be
  able to live in several topics.
 */

var GambitCore = null;
var ReplyCore = null;
var TopicCore = null;
var UserCore = null;

var createChatSystem = function createChatSystem(db) {
  GambitCore = (0, _gambit2.default)(db);
  ReplyCore = (0, _reply2.default)(db);
  TopicCore = (0, _topic2.default)(db);
  UserCore = (0, _user2.default)(db);
};

var createChatSystemForTenant = function createChatSystemForTenant() {
  var tenantId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'master';

  var Gambit = GambitCore.byTenant(tenantId);
  var Reply = ReplyCore.byTenant(tenantId);
  var Topic = TopicCore.byTenant(tenantId);
  var User = UserCore.byTenant(tenantId);

  return {
    Gambit: Gambit,
    Reply: Reply,
    Topic: Topic,
    User: User
  };
};

exports.default = {
  createChatSystem: createChatSystem,
  createChatSystemForTenant: createChatSystemForTenant
};