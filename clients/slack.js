import SuperScript from 'superscript';
// slack-client provides auth and sugar around dealing with the RealTime API.
import Slack from 'slack-client';

// Auth Token - You can generate your token from
// https://<slack_name>.slack.com/services/new/bot
const token = '...';

// How should we reply to the user?
// direct - sents a DM
// atReply - sents a channel message with @username
// public sends a channel reply with no username
const replyType = 'atReply';

const atReplyRE = /<@(.*?)>/;

const slack = new Slack(token, true, true);

const receiveData = function receiveData(slack, bot, data) {
  // Fetch the user who sent the message;
  const user = data._client.users[data.user];
  let channel;
  const messageData = data.toJSON();
  let message = '';

  if (messageData && messageData.text) {
    message = `${messageData.text.trim()}`;
  }

  const match = message.match(atReplyRE);

  // Are they talking to us?
  if (match && match[1] === slack.self.id) {
    message = message.replace(atReplyRE, '').trim();
    if (message[0] === ':') {
      message = message.substring(1).trim();
    }

    bot.reply(user.name, message, (err, reply) => {
      // We reply back direcly to the user
      switch (replyType) {
        case 'direct':
          channel = slack.getChannelGroupOrDMByName(user.name);
          break;
        case 'atReply':
          reply.string = `@${user.name} ${reply.string}`;
          channel = slack.getChannelGroupOrDMByID(messageData.channel);
          break;
        case 'public':
          channel = slack.getChannelGroupOrDMByID(messageData.channel);
          break;
      }

      if (reply.string) {
        channel.send(reply.string);
      }
    });
  } else if (messageData.channel[0] === 'D') {
    bot.reply(user.name, message, (err, reply) => {
      channel = slack.getChannelGroupOrDMByName(user.name);
      if (reply.string) {
        channel.send(reply.string);
      }
    });
  } else {
    console.log('Ignoring...', messageData);
  }
};

const botHandle = function botHandle(err, bot) {
  slack.login();

  slack.on('error', (error) => {
    console.error(`Error: ${error}`);
  });

  slack.on('open', () => {
    console.log('Welcome to Slack. You are %s of %s', slack.self.name, slack.team.name);
  });

  slack.on('close', () => {
    console.warn('Disconnected');
  });

  slack.on('message', (data) => {
    receiveData(slack, bot, data);
  });
};

// Main entry point
const options = {
  factSystem: {
    clean: true,
  },
  importFile: './data.json',
};

SuperScript.setup(options, (err, bot) => {
  botHandle(null, bot);
});
