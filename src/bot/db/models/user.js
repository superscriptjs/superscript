import fs from 'fs';
import _ from 'lodash';
import debuglog from 'debug-levels';
import findOrCreate from 'mongoose-findorcreate';
import mkdirp from 'mkdirp';
import mongoose from 'mongoose';
import mongoTenant from 'mongo-tenant';

import modelNames from '../modelNames';
import factSystem from '../../factSystem';
import logger from '../../logger';

const debug = debuglog('SS:User');

const createUserModel = function createUserModel(db) {
  const userSchema = mongoose.Schema({
    id: String,
    status: Number,
    currentTopic: String,
    pendingTopic: String,
    lastMessageSentAt: Date,
    volley: Number,
    rally: Number,
    prevAns: Number,
    conversation: Number,
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

  userSchema.methods.updateHistory = function (msg, reply, replyObj, cb) {
    if (!_.isNull(msg)) {
      this.lastMessageSentAt = new Date();
    }

    // New Log format.
    const log = {
      user_id: this.id,
      raw_input: msg.original,
      normalized_input: msg.clean,
      matched_gambit: replyObj.minMatchSet,
      final_output: reply.clean,
      timestamp: msg.createdAt,
    };

    const cleanId = this.id.replace(/\W/g, '');
    logger.log(`${JSON.stringify(log)}\r\n`, `${cleanId}_trans.txt`);

    // Did we successfully volley?
    // In order to keep the conversation flowing we need to have rythum and this means we always
    // need to continue to engage.
    if (reply.isQuestion) {
      this.volley = 1;
      this.rally = this.rally + 1;
    } else {
      // We killed the rally
      this.volley = 0;
      this.rally = 0;
    }

    this.conversation = this.conversation + 1;

    debug.verbose('Updating History');
    msg.messageScope = null;

    const stars = replyObj.stars;

    // Don't serialize MongoDOWN to Mongo
    msg.factSystem = null;
    reply.factSystem = null;
    reply.replyIds = replyObj.replyIds;

    this.history.stars.unshift(stars);
    this.history.input.unshift(msg);
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
          debug.verbose('Saved user');
          if (err) {
            console.error(err);
          }
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
    return factSystem.createFactSystemForTenant(this.getTenantId()).createUserDB(this.id);
  });

  return db.model(modelNames.user, userSchema);
};

export default createUserModel;
