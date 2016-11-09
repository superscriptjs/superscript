/**
 *  Import a data file into MongoDB
 */

import fs from 'fs';
import async from 'async';
import _ from 'lodash';
import debuglog from 'debug-levels';

import Utils from '../utils';

const debug = debuglog('SS:Importer');

const KEEP_REGEX = new RegExp('\{keep\}', 'i');
const FILTER_REGEX = /\{\s*\^(\w+)\(([\w<>,\s]*)\)\s*\}/i;

const rawToGambitData = function rawToGambitData(gambitId, gambit) {
  const gambitData = {
    id: gambitId,
    isQuestion: false,
    qType: '',
    qSubType: '',
    conditions: gambit.conditional,
    filter: gambit.trigger.filter || '',
    trigger: gambit.trigger.clean,
    input: gambit.trigger.raw,
  };

  if (gambit.trigger.question !== null) {
    gambitData.isQuestion = true;
    gambitData.qType = gambit.trigger.question.questionType;
    gambitData.qSubType = gambit.trigger.question.questionSubtype;
  }

  if (gambit.redirect) {
    gambitData.redirect = gambit.redirect;
  }

  return gambitData;
};

const importData = function importData(chatSystem, data, callback) {
  const Topic = chatSystem.Topic;
  const Gambit = chatSystem.Gambit;
  const Reply = chatSystem.Reply;
  const User = chatSystem.User;

  const gambitsWithConversation = [];

  const eachReplyItor = function eachReplyItor(gambit) {
    return (replyId, nextReply) => {
      debug.verbose('Reply process: %s', replyId);
      const properties = {
        id: replyId,
        reply: data.replies[replyId],
        parent: gambit._id,
      };

      let match = properties.reply.match(KEEP_REGEX);
      if (match) {
        properties.keep = true;
        properties.reply = Utils.trim(properties.reply.replace(match[0], ''));
      }

      match = properties.reply.match(FILTER_REGEX);
      if (match) {
        properties.filter = `^${match[1]}(${match[2]})`;
        properties.reply = Utils.trim(properties.reply.replace(match[0], ''));
      }

      gambit.addReply(properties, (err) => {
        if (err) {
          console.error(err);
        }
        nextReply();
      });
    };
  };

  const eachGambitItor = function eachGambitItor(topic) {
    return (gambitId, nextGambit) => {
      const gambit = data.gambits[gambitId];
      if (gambit.conversation) {
        debug.verbose('Gambit has conversation (deferring process): %s', gambitId);
        gambitsWithConversation.push(gambitId);
        nextGambit();
      } else if (gambit.topic === topic.name) {
        debug.verbose('Gambit process: %s', gambitId);
        const gambitData = rawToGambitData(gambitId, gambit);

        topic.createGambit(gambitData, (err, mongoGambit) => {
          if (err) {
            console.error(err);
          }
          async.eachSeries(gambit.replies, eachReplyItor(mongoGambit), (err) => {
            if (err) {
              console.error(err);
            }
            nextGambit();
          });
        });
      } else {
        nextGambit();
      }
    };
  };

  const eachTopicItor = function eachTopicItor(topicName, nextTopic) {
    const topic = data.topics[topicName];
    debug.verbose(`Find or create topic with name '${topicName}'`);
    const topicProperties = {
      name: topic.name,
      keep: topic.flags.indexOf('keep') !== -1,
      nostay: topic.flags.indexOf('nostay') !== -1,
      system: topic.flags.indexOf('system') !== -1,
      keywords: topic.keywords,
      filter: topic.filter || '',
    };

    Topic.findOrCreate({ name: topic.name }, topicProperties, (err, mongoTopic) => {
      if (err) {
        console.error(err);
      }

      async.eachSeries(Object.keys(data.gambits), eachGambitItor(mongoTopic), (err) => {
        if (err) {
          console.error(err);
        }
        debug.verbose(`All gambits for ${topic.name} processed.`);
        nextTopic();
      });
    });
  };

  const eachConvItor = function eachConvItor(gambitId) {
    return (replyId, nextConv) => {
      debug.verbose('conversation/reply: %s', replyId);
      Reply.findOne({ id: replyId }, (err, reply) => {
        if (err) {
          console.error(err);
        }
        if (reply) {
          reply.gambits.addToSet(gambitId);
          reply.save((err) => {
            if (err) {
              console.error(err);
            }
            reply.sortGambits(() => {
              debug.verbose('All conversations for %s processed.', gambitId);
              nextConv();
            });
          });
        } else {
          debug.warn('No reply found!');
          nextConv();
        }
      });
    };
  };

  debug.info('Cleaning database: removing all data.');

  // Remove everything before we start importing
  async.each([Gambit, Reply, Topic, User],
    (model, nextModel) => {
      model.remove({}, err => nextModel());
    },
    (err) => {
      async.eachSeries(Object.keys(data.topics), eachTopicItor, () => {
        async.eachSeries(_.uniq(gambitsWithConversation), (gambitId, nextGambit) => {
          const gambitRawData = data.gambits[gambitId];

          const conversations = gambitRawData.conversation || [];
          if (conversations.length === 0) {
            return nextGambit();
          }

          const gambitData = rawToGambitData(gambitId, gambitRawData);
          // TODO: gambit.parent should be able to be multiple replies, not just conversations[0]
          const replyId = conversations[0];

          // TODO??: Add reply.addGambit(...)
          Reply.findOne({ id: replyId }, (err, reply) => {
            if (!reply) {
              console.error(`Gambit ${gambitId} is supposed to have conversations (has %), but none were found.`);
              nextGambit();
            }
            const gambit = new Gambit(gambitData);
            async.eachSeries(gambitRawData.replies, eachReplyItor(gambit), (err) => {
              debug.verbose('All replies processed.');
              gambit.parent = reply._id;
              debug.verbose('Saving new gambit: ', err, gambit);
              gambit.save((err, gam) => {
                if (err) {
                  console.log(err);
                }
                async.mapSeries(conversations, eachConvItor(gam._id), (err, results) => {
                  debug.verbose('All conversations for %s processed.', gambitId);
                  nextGambit();
                });
              });
            });
          });
        }, () => {
          callback(null, 'done');
        });
      });
    }
  );
};

const importFile = function importFile(chatSystem, path, callback) {
  fs.readFile(path, (err, jsonFile) => {
    if (err) {
      console.log(err);
    }
    return importData(chatSystem, JSON.parse(jsonFile), callback);
  });
};

export default { importFile, importData };
