/**
  Topics are a grouping of gambits.
  The order of the Gambits are important, and a gambit can live in more than one topic.
**/

import mongoose from 'mongoose';
import natural from 'natural';
import _ from 'lodash';
import async from 'async';
import findOrCreate from 'mongoose-findorcreate';
import debuglog from 'debug-levels';
import parser from 'ss-parser';

import Sort from '../sort';
import helpers from '../helpers';

const debug = debuglog('SS:Topics');

const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();

natural.PorterStemmer.attach();

// Function to score the topics by TF-IDF
const scoreTopics = function scoreTopics(message) {
  let topics = [];
  const tasMessage = message.lemString.tokenizeAndStem();
  debug.verbose('Tokenised and stemmed words: ', tasMessage);

  // Score the input against the topic keywords to come up with a topic order.
  tfidf.tfidfs(tasMessage, (index, score, name) => {
    // Filter out system topic pre/post
    if (name !== '__pre__' && name !== '__post__') {
      topics.push({ name, score, type: 'TOPIC' });
    }
  });

  // Removes duplicate entries.
  topics = _.uniqBy(topics, 'name');

  const topicOrder = _.sortBy(topics, 'score').reverse();
  debug.verbose('Scored topics: ', topicOrder);

  return topicOrder;
};

const createTopicModel = function createTopicModel(db) {
  const topicSchema = new mongoose.Schema({
    name: { type: String, index: true, unique: true },
    keep: { type: Boolean, default: false },
    system: { type: Boolean, default: false },
    nostay: { type: Boolean, default: false },
    filter: { type: String, default: '' },
    keywords: { type: Array },
    gambits: [{ type: String, ref: 'Gambit' }],
  });

  topicSchema.pre('save', function (next) {
    if (!_.isEmpty(this.keywords)) {
      const keywords = this.keywords.join(' ');
      if (keywords) {
        tfidf.addDocument(keywords.tokenizeAndStem(), this.name);
      }
    }
    next();
  });

  // This will create the Gambit and add it to the model
  topicSchema.methods.createGambit = function (gambitData, callback) {
    if (!gambitData) {
      return callback('No data');
    }

    const Gambit = db.model('Gambit');
    const gambit = new Gambit(gambitData);
    gambit.save((err) => {
      if (err) {
        return callback(err);
      }
      this.gambits.addToSet(gambit._id);
      this.save((err) => {
        callback(err, gambit);
      });
    });
  };

  topicSchema.methods.sortGambits = function (callback) {
    const expandReorder = (gambitId, cb) => {
      db.model('Gambit').findById(gambitId, (err, gambit) => {
        if (err) {
          console.log(err);
        }
        cb(null, gambit);
      });
    };

    async.map(this.gambits, expandReorder, (err, newGambitList) => {
      if (err) {
        console.log(err);
      }

      const newList = Sort.sortTriggerSet(newGambitList);
      this.gambits = newList.map(gambit => gambit._id);
      this.save(callback);
    });
  };

  topicSchema.methods.findMatch = function findMatch(message, options, callback) {
    options.topic = this.name;

    helpers.findMatchingGambitsForMessage(db, 'topic', this._id, message, options, callback);
  };

  // Lightweight match for one topic
  // TODO: offload this to common
  topicSchema.methods.doesMatch = function (message, options, cb) {
    const itor = (gambit, next) => {
      gambit.doesMatch(message, options, (err, match2) => {
        if (err) {
          debug.error(err);
        }
        next(err, match2 ? gambit._id : null);
      });
    };

    db.model('Topic').findOne({ name: this.name }, 'gambits')
      .populate('gambits')
      .exec((err, mgambits) => {
        if (err) {
          debug.error(err);
        }
        async.filter(mgambits.gambits, itor, (err, res) => {
          cb(null, res);
        });
      });
  };

  topicSchema.methods.clearGambits = function (callback) {
    const clearGambit = (gambitId, cb) => {
      this.gambits.pull({ _id: gambitId });
      db.model('Gambit').findById(gambitId, (err, gambit) => {
        if (err) {
          debug.error(err);
        }

        gambit.clearReplies(() => {
          db.model('Gambit').remove({ _id: gambitId }, (err) => {
            if (err) {
              debug.error(err);
            }

            debug.verbose('removed gambit %s', gambitId);

            cb(null, gambitId);
          });
        });
      });
    };

    async.map(this.gambits, clearGambit, (err, clearedGambits) => {
      this.save((err) => {
        callback(err, clearedGambits);
      });
    });
  };

  // This will find a gambit in any topic
  topicSchema.statics.findTriggerByTrigger = function (input, callback) {
    db.model('Gambit').findOne({ input }).exec(callback);
  };

  topicSchema.statics.findByName = function (name, callback) {
    this.findOne({ name }, {}, callback);
  };

  topicSchema.statics.findPendingTopicsForUser = function (user, message, callback) {
    const currentTopic = user.getTopic();
    const pendingTopics = [];

    const scoredTopics = scoreTopics(message);

    const removeMissingTopics = function removeMissingTopics(topics) {
      return _.filter(topics, topic =>
         topic.id
      );
    };

    this.find({}, (err, allTopics) => {
      if (err) {
        debug.error(err);
      }

      // Add the current topic to the front of the array.
      scoredTopics.unshift({ name: currentTopic, type: 'TOPIC' });

      let otherTopics = _.map(allTopics, topic =>
         ({ id: topic._id, name: topic.name, system: topic.system })
      );

      // This gets a list if all the remaining topics.
      otherTopics = _.filter(otherTopics, topic =>
         !_.find(scoredTopics, { name: topic.name })
      );

      // We remove the system topics
      otherTopics = _.filter(otherTopics, topic =>
         topic.system === false
      );

      pendingTopics.push({ name: '__pre__', type: 'TOPIC' });

      for (let i = 0; i < scoredTopics.length; i++) {
        if (scoredTopics[i].name !== '__pre__' && scoredTopics[i].name !== '__post__') {
          pendingTopics.push(scoredTopics[i]);
        }
      }

      // Search random as the highest priority after current topic and pre
      if (!_.find(pendingTopics, { name: 'random' }) && _.find(otherTopics, { name: 'random' })) {
        pendingTopics.push({ name: 'random', type: 'TOPIC' });
      }

      for (let i = 0; i < otherTopics.length; i++) {
        if (otherTopics[i].name !== '__pre__' && otherTopics[i].name !== '__post__') {
          otherTopics[i].type = 'TOPIC';
          pendingTopics.push(otherTopics[i]);
        }
      }

      pendingTopics.push({ name: '__post__', type: 'TOPIC' });

      debug.verbose(`Pending topics before conversations: ${JSON.stringify(pendingTopics)}`);

      // Lets assign the ids to the topics
      for (let i = 0; i < pendingTopics.length; i++) {
        const topicName = pendingTopics[i].name;
        for (let n = 0; n < allTopics.length; n++) {
          if (allTopics[n].name === topicName) {
            pendingTopics[i].id = allTopics[n]._id;
          }
        }
      }

      // If we are currently in a conversation, we want the entire chain added
      // to the topics to search
      const lastReply = user.__history__.reply[0];
      if (!_.isEmpty(lastReply)) {
        // If the message is less than 5 minutes old we continue
        // TODO: Make this time configurable
        const delta = new Date() - lastReply.createdAt;
        if (delta <= 1000 * 300) {
          const replyId = lastReply.replyId;
          const clearBit = lastReply.clearConvo;

          debug('Last reply: ', lastReply.original, replyId, clearBit);

          if (clearBit === true) {
            debug('Conversation RESET by clearBit');
            callback(null, removeMissingTopics(pendingTopics));
          } else {
            db.model('Reply')
              .findOne({ _id: replyId })
              .exec((err, reply) => {
                if (!reply) {
                  debug("We couldn't match the last reply. Continuing.");
                  callback(null, removeMissingTopics(pendingTopics));
                } else {
                  helpers.walkReplyParent(db, reply._id, (err, replyThreads) => {
                    debug.verbose(`Threads found by walkReplyParent: ${replyThreads}`);
                    replyThreads = replyThreads.map(item =>
                       ({ id: item, type: 'REPLY' })
                    );

                    // This inserts the array replyThreads into pendingTopics after the first topic
                    replyThreads.unshift(1, 0);
                    Array.prototype.splice.apply(pendingTopics, replyThreads);

                    callback(null, removeMissingTopics(pendingTopics));
                  });
                }
              });
          }
        } else {
          debug.info('The conversation thread was to old to continue it.');
          callback(null, removeMissingTopics(pendingTopics));
        }
      } else {
        callback(null, removeMissingTopics(pendingTopics));
      }
    });
  };

  topicSchema.plugin(findOrCreate);

  return db.model('Topic', topicSchema);
};

export default createTopicModel;
