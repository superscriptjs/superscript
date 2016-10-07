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

const rawToGambitData = function rawToGambitData(gambitId, itemData) {
  const gambitData = {
    id: gambitId,
    isQuestion: itemData.options.isQuestion,
    isCondition: itemData.options.isConditional,
    qType: itemData.options.qType === false ? '' : itemData.options.qType,
    qSubType: itemData.options.qSubType === false ? '' : itemData.options.qSubType,
    filter: itemData.options.filter === false ? '' : itemData.options.filter,
    trigger: itemData.trigger,
  };

  // This is to capture anything pre 5.1
  if (itemData.raw) {
    gambitData.input = itemData.raw;
  } else {
    gambitData.input = itemData.trigger;
  }

  if (itemData.redirect !== null) {
    gambitData.redirect = itemData.redirect;
  }

  return gambitData;
};

const importData = function importData(chatSystem, data, callback) {
  const Condition = chatSystem.Condition;
  const Topic = chatSystem.Topic;
  const Gambit = chatSystem.Gambit;
  const Reply = chatSystem.Reply;
  const User = chatSystem.User;

  const gambitsWithConversation = [];

  const eachReplyItor = function eachReplyItor(gambit) {
    return (replyId, nextReply) => {
      debug.verbose('Reply process: %s', replyId);
      const replyString = data.replies[replyId];
      const properties = { id: replyId, reply: replyString, parent: gambit._id };
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
      if (!_.isUndefined(data.gambits[gambitId].options.conversations)) {
        gambitsWithConversation.push(gambitId);
        nextGambit();
      } else if (data.gambits[gambitId].topic === topic.name) {
        debug.verbose('Gambit process: %s', gambitId);
        const gambitRawData = data.gambits[gambitId];
        const gambitData = rawToGambitData(gambitId, gambitRawData);

        topic.createGambit(gambitData, (err, gambit) => {
          if (err) {
            console.error(err);
          }
          async.eachSeries(gambitRawData.replies, eachReplyItor(gambit), (err) => {
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
    debug.verbose(`Find or create topic with name '${topicName}'`);
    const topicProperties = {
      name: topicName,
      keep: data.topics[topicName].flags.indexOf('keep') !== -1,
      nostay: data.topics[topicName].flags.indexOf('nostay') !== -1,
      system: data.topics[topicName].flags.indexOf('system') !== -1,
      keywords: data.topics[topicName].keywords ? data.topics[topicName].keywords : [],
      filter: (data.topics[topicName].filter) ? data.topics[topicName].filter : '',
    };

    Topic.findOrCreate({ name: topicName }, topicProperties, (err, topic) => {
      if (err) {
        console.error(err);
      }

      async.eachSeries(Object.keys(data.gambits), eachGambitItor(topic), (err) => {
        if (err) {
          console.error(err);
        }
        debug.verbose(`All gambits for ${topicName} processed.`);
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

  async.each([Condition, Gambit, Reply, Topic, User],
    (model, nextModel) => {
      model.remove({}, err => nextModel());
    },
    (err) => {
      async.eachSeries(Object.keys(data.topics), eachTopicItor, () => {
        async.eachSeries(_.uniq(gambitsWithConversation), (gambitId, nextGambit) => {
          const gambitRawData = data.gambits[gambitId];

          const conversations = gambitRawData.options.conversations || [];
          if (conversations.length === 0) {
            return nextGambit();
          }

          const gambitData = rawToGambitData(gambitId, gambitRawData);
          const replyId = conversations[0];

          // TODO??: Add reply.addGambit(...)
          Reply.findOne({ id: replyId }, (err, reply) => {
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
          // Move on to conditions
          const conditionItor = function conditionItor(conditionId, next) {
            const condition = data.conditions[conditionId];
            Topic.findOne({ name: condition.topic }, (err, topic) => {
              topic.createCondition(condition, (err, condition) => {
                if (err) {
                  console.log(err);
                }
                next();
              });
            });
          };

          async.eachSeries(Object.keys(data.conditions), conditionItor, () => {
            debug.verbose('All conditions processed');
            callback(null, 'done');
          });
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
