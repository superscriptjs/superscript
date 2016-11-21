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

import createGambitModel from './db/models/gambit';
import createReplyModel from './db/models/reply';
import createTopicModel from './db/models/topic';
import createUserModel from './db/models/user';

let GambitCore = null;
let ReplyCore = null;
let TopicCore = null;
let UserCore = null;

const createChatSystem = function createChatSystem(db) {
  GambitCore = createGambitModel(db);
  ReplyCore = createReplyModel(db);
  TopicCore = createTopicModel(db);
  UserCore = createUserModel(db);
};

const createChatSystemForTenant = function createChatSystemForTenant(tenantId = 'master') {
  const Gambit = GambitCore.byTenant(tenantId);
  const Reply = ReplyCore.byTenant(tenantId);
  const Topic = TopicCore.byTenant(tenantId);
  const User = UserCore.byTenant(tenantId);

  return {
    Gambit,
    Reply,
    Topic,
    User,
  };
};

export default {
  createChatSystem,
  createChatSystemForTenant,
};
