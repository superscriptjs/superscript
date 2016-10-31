import fs from 'fs';
import _ from 'lodash';
import debuglog from 'debug-levels';
import findOrCreate from 'mongoose-findorcreate';
import mkdirp from 'mkdirp';
import mongoose from 'mongoose';

const debug = debuglog('SS:User');

mkdirp.sync(`${process.cwd()}/logs/`);

const createUserModel = function createUserModel(db, factSystem) {
  const userSchema = mongoose.Schema({
    id: String,
    status: Number,
    currentTopic: String,
    pendingTopic: String,
    conversationStartedAt: Date,
    lastMessageSentAt: Date,
    volley: Number,
    rally: Number,
    conversation: Number,
    prevAns: Number,
    slot1: Object,
    slot2: Object,
    conversationState: Object,
    __history__: {
      input: [],
      reply: [],
      topic: [],
      stars: [],
    },
  });

  userSchema.pre('save', function (next) {
    debug.verbose('Pre-Save Hook');
    this.__history__.input = this.__history__.input.slice(0, 15);
    this.__history__.reply = this.__history__.reply.slice(0, 15);
    this.__history__.topic = this.__history__.topic.slice(0, 15);
    this.__history__.stars = this.__history__.stars.slice(0, 15);
    next();
  });

  userSchema.methods.clearConversationState = function (callback) {
    this.conversationState = {};
    this.save(callback);
  };

  userSchema.methods.setTopic = function (topic) {
    if (topic !== '' || topic !== 'undefined') {
      debug.verbose('setTopic', topic);
      this.pendingTopic = topic;
      /* this.save(function() {
        // We should probably have a callback here.
        debug.verbose("setTopic Complete");
      });*/
    } else {
      debug.warn('Trying to set topic to someting invalid');
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
    fs.appendFileSync(`${process.cwd()}/logs/${cleanId}_trans.txt`, `${JSON.stringify(log)}\r\n`);

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

    this.__history__.stars.unshift(stars);
    this.__history__.input.unshift(msg);
    this.__history__.reply.unshift(reply);
    this.__history__.topic.unshift(this.currentTopic);

    if (this.pendingTopic !== undefined && this.pendingTopic !== '') {
      const pendingTopic = this.pendingTopic;
      this.pendingTopic = null;

      db.model('Topic').findOne({ name: pendingTopic }, (err, topicData) => {
        if (topicData && topicData.nostay === true) {
          this.currentTopic = this.__history__.topic[0];
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

  userSchema.virtual('memory').get(function () {
    return factSystem.createUserDB(this.id);
  });

  return db.model('User', userSchema);
};

export default createUserModel;
