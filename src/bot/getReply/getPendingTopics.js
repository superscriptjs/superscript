import _ from 'lodash';
import debuglog from 'debug-levels';
import natural from 'natural';

import helpers from './helpers';

const debug = debuglog('SS:Topics');

const TfIdf = natural.TfIdf;

natural.PorterStemmer.attach();

// Function to score the topics by TF-IDF
const scoreTopics = function scoreTopics(message, tfidf) {
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

const removeMissingTopics = function removeMissingTopics(topics) {
  return _.filter(topics, topic => topic.id);
};

const findConversationTopics = async function findConversationTopics(pendingTopics, user, chatSystem, conversationTimeout) {
  // If we are currently in a conversation, we want the entire chain added
  // to the topics to search
  const lastReply = user.history.reply[0];
  if (!_.isEmpty(lastReply)) {
    // If the message is less than _ minutes old we continue
    const delta = Date.now() - lastReply.createdAt;
    if (delta <= conversationTimeout) {
      debug.verbose(`Last reply string: ${lastReply.original}`);
      debug.verbose(`Last reply sequence: ${lastReply.replyIds}`);
      debug.verbose(`Clear conversation: ${lastReply.clearConversation}`);

      if (lastReply.clearConversation) {
        debug.verbose('Conversation RESET since clearConversation was true');
        return pendingTopics;
      }

      const replies = await chatSystem.Reply.find({ _id: { $in: lastReply.replyIds } });
      if (replies === []) {
        debug.verbose("We couldn't match the last reply. Continuing.");
        return pendingTopics;
      }

      let replyThreads = [];

      await Promise.all(replies.map(async (reply) => {
        const threads = await helpers.walkReplyParent(reply._id, chatSystem);
        debug.verbose(`Threads found by walkReplyParent: ${threads}`);
        threads.forEach(thread => replyThreads.push(thread));
      }));

      replyThreads = replyThreads.map(item => ({ id: item, type: 'REPLY' }));
      // This inserts the array replyThreads into pendingTopics after the first topic
      pendingTopics.splice(1, 0, ...replyThreads);
      return pendingTopics;
    }

    debug.info('The conversation thread was to old to continue it.');
    return pendingTopics;
  }
  return pendingTopics;
};

export const findPendingTopicsForUser = async function findPendingTopicsForUser(user, message, chatSystem, conversationTimeout) {
  const allTopics = await chatSystem.Topic.find({});

  const tfidf = new TfIdf();

  allTopics.forEach((topic) => {
    const keywords = topic.keywords.join(' ');
    if (keywords) {
      tfidf.addDocument(keywords.tokenizeAndStem(), topic.name);
    }
  });

  const scoredTopics = scoreTopics(message, tfidf);

  const currentTopic = user.getTopic();

  // Add the current topic to the front of the array.
  scoredTopics.unshift({ name: currentTopic, type: 'TOPIC' });

  let otherTopics = _.map(allTopics, topic =>
     ({ id: topic._id, name: topic.name, system: topic.system }),
  );

  // This gets a list if all the remaining topics.
  otherTopics = _.filter(otherTopics, topic =>
     !_.find(scoredTopics, { name: topic.name }),
  );

  // We remove the system topics
  otherTopics = _.filter(otherTopics, topic =>
     topic.system === false,
  );

  const pendingTopics = [];
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

  debug.verbose(`Pending topics before conversations: ${JSON.stringify(pendingTopics, null, 2)}`);

  // Lets assign the ids to the topics
  for (let i = 0; i < pendingTopics.length; i++) {
    const topicName = pendingTopics[i].name;
    for (let n = 0; n < allTopics.length; n++) {
      if (allTopics[n].name === topicName) {
        pendingTopics[i].id = allTopics[n]._id;
      }
    }
  }

  const allFoundTopics = await findConversationTopics(pendingTopics, user, chatSystem, conversationTimeout);
  return removeMissingTopics(allFoundTopics);
};

const getPendingTopics = async function getPendingTopics(messageObject, options) {
  // We already have a pre-set list of potential topics from directReply, respond or topicRedirect
  if (!_.isEmpty(_.reject(options.pendingTopics, _.isNull))) {
    debug.verbose('Using pre-set topic list via directReply, respond or topicRedirect');
    debug.info('Topics to check: ', options.pendingTopics.map(topic => topic.name));
    return options.pendingTopics;
  }

  // Find potential topics for the response based on the message (tfidfs)
  return await findPendingTopicsForUser(
    options.user,
    messageObject,
    options.system.chatSystem,
    options.system.conversationTimeout,
  );
};

export default getPendingTopics;
