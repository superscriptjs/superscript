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

import createConditionModel from './db/models/condition';
import createGambitModel from './db/models/gambit';
import createReplyModel from './db/models/reply';
import createTopicModel from './db/models/topic';
import createUserModel from './db/models/user';

const createChatSystem = function createChatSystem(db, factSystem) {
  const Condition = createConditionModel(db);
  const Gambit = createGambitModel(db, factSystem);
  const Reply = createReplyModel(db);
  const Topic = createTopicModel(db);
  const User = createUserModel(db, factSystem);

  return {
    Condition,
    Gambit,
    Reply,
    Topic,
    User,
  };
};

export default createChatSystem;
