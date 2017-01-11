import _ from 'lodash';
import debuglog from 'debug-levels';
import findOrCreate from 'mongoose-findorcreate';
import mongoose from 'mongoose';
import mongoTenant from 'mongo-tenant';

import modelNames from '../modelNames';

const debug = debuglog('SS:User');

const createUserModel = function createUserModel(db, factSystem, logger) {
  const userSchema = mongoose.Schema({
    id: String,
    status: Number,
    currentTopic: String,
    pendingTopic: String,
    lastMessageSentAt: Date,
    prevAns: Number,
    conversationState: Object,
    history: {
      input: [],
      reply: [],
      topic: [],
      stars: [],
    },
  });

  userSchema.pre('save', function (next) {
    debug.verbose('Pre-Save Hook');
    this.history.input = this.history.input.slice(0, 15);
    this.history.reply = this.history.reply.slice(0, 15);
    this.history.topic = this.history.topic.slice(0, 15);
    this.history.stars = this.history.stars.slice(0, 15);
    next();
  });

  userSchema.methods.clearConversationState = function (callback) {
    this.conversationState = {};
    this.save(callback);
  };

  userSchema.methods.setTopic = function (topic, callback) {
    if (topic !== '' || topic !== 'undefined') {
      debug.verbose('setTopic', topic);
      this.pendingTopic = topic;
      this.save(() => {
        debug.verbose('setTopic Complete');
        callback(null);
      });
    } else {
      debug.warn('Trying to set topic to someting invalid');
      callback(null);
    }
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

    this.history.stars.unshift(stars);
    this.history.input.unshift(messageToSave);
    this.history.reply.unshift(reply);
    this.history.topic.unshift(this.currentTopic);

    if (this.pendingTopic !== undefined && this.pendingTopic !== '') {
      const pendingTopic = this.pendingTopic;
      this.pendingTopic = null;

      db.model(modelNames.topic).byTenant(this.getTenantId()).findOne({ name: pendingTopic }, (err, topicData) => {
        if (topicData && topicData.nostay === true) {
          this.currentTopic = this.history.topic[0];
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

  userSchema.plugin(findOrCreate);
  userSchema.plugin(mongoTenant);

  userSchema.virtual('memory').get(function () {
    return factSystem.getFactSystem(this.getTenantId()).createUserDB(this.id);
  });

  return db.model(modelNames.user, userSchema);
};

export default createUserModel;
