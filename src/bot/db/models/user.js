import _ from 'lodash';
import debuglog from 'debug-levels';
import mongoose from 'mongoose';
import mongoTenant from 'mongo-tenant';

import modelNames from '../modelNames';

const debug = debuglog('SS:User');

const createUserModel = function createUserModel(db, factSystem, logger) {
  const userSchema = mongoose.Schema({
    id: String,
    currentTopic: { type: String, default: 'random' },
    pendingTopic: String,
    lastMessageSentAt: Date,
    prevAns: Number,
    conversationState: Object,
    history: [{
      input: Object,
      reply: Object,
      topic: Object,
      stars: Object,
    }],
  });

  userSchema.pre('save', function (next) {
    debug.verbose('Pre-Save Hook');
    // save a full log of user conversations, but just in case a user has a
    // super long conversation, don't take up too much storage space
    this.history = this.history.slice(0, 500);
    next();
  });

  userSchema.methods.clearConversationState = function (callback) {
    this.conversationState = {};
    this.save(callback);
  };

  userSchema.methods.setTopic = async function (topic = '') {
    debug.verbose('Set topic', topic);

    if (topic === '') {
      debug.warn('Trying to set topic to something invalid');
      return;
    }

    this.pendingTopic = topic;
    await this.save();
    debug.verbose('Set topic Complete');
  };

  userSchema.methods.getTopic = function () {
    debug.verbose('getTopic', this.currentTopic);
    return this.currentTopic;
  };

  userSchema.methods.updateHistory = function (message, reply, cb) {
    if (!_.isNull(message)) {
      this.lastMessageSentAt = Date.now();
    }

    const log = {
      user_id: this.id,
      raw_input: message.original,
      normalized_input: message.clean,
      matched_gambit: reply.debug,
      final_output: reply.original,
      timestamp: message.createdAt,
    };

    const cleanId = this.id.replace(/\W/g, '');
    logger.log(`${JSON.stringify(log)}\r\n`, `${cleanId}_trans.txt`);

    debug.verbose('Updating History');

    const stars = reply.stars;

    const messageToSave = {
      original: message.original,
      clean: message.clean,
      timestamp: message.createdAt,
    };

    reply.createdAt = Date.now();

    this.history.unshift({
      stars,
      input: messageToSave,
      reply,
      topic: this.currentTopic,
    });

    if (this.pendingTopic !== undefined && this.pendingTopic !== '') {
      const pendingTopic = this.pendingTopic;
      this.pendingTopic = null;

      db.model(modelNames.topic).byTenant(this.getTenantId()).findOne({ name: pendingTopic }, (err, topicData) => {
        if (topicData && topicData.nostay === true) {
          this.currentTopic = this.history[0].topic;
        } else {
          this.currentTopic = pendingTopic;
        }
        this.save((err) => {
          if (err) {
            console.error(err);
          }
          debug.verbose('Saved user');
          cb(err, log);
        });
      });
    } else {
      cb(null, log);
    }
  };

  userSchema.methods.getVar = function (key, cb) {
    debug.verbose('getVar', key);

    this.memory.db.get({ subject: key, predicate: this.id }, (err, res) => {
      if (res && res.length !== 0) {
        cb(err, res[0].object);
      } else {
        cb(err, null);
      }
    });
  };

  userSchema.methods.setVar = function (key, value, cb) {
    debug.verbose('setVar', key, value);
    const self = this;

    self.memory.db.get({ subject: key, predicate: self.id }, (err, results) => {
      if (err) {
        console.log(err);
      }

      if (!_.isEmpty(results)) {
        self.memory.db.del(results[0], () => {
          const opt = { subject: key, predicate: self.id, object: value };
          self.memory.db.put(opt, () => {
            cb();
          });
        });
      } else {
        const opt = { subject: key, predicate: self.id, object: value };
        self.memory.db.put(opt, (err2) => {
          if (err2) {
            console.log(err2);
          }

          cb();
        });
      }
    });
  };

  userSchema.plugin(mongoTenant);

  userSchema.virtual('memory').get(function () {
    return factSystem.getFactSystem(this.getTenantId()).createUserDB(this.id);
  });

  return db.model(modelNames.user, userSchema);
};

export default createUserModel;
