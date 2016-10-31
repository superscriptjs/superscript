import async from 'async';
import debuglog from 'debug-levels';

import Message from '../message';
import Utils from '../utils';
import processHelpers from './common';
import getReply from '../getReply';

const debug = debuglog('SS:Reply:inline');

const inlineRedirect = function inlineRedirect(reply, redirectMatch, options, callback) {
  return async.whilst(() => redirectMatch, (cb) => {
    const target = redirectMatch[1];
    debug.verbose(`Inline redirection to: '${target}'`);

      // if we have a special topic, reset it to the previous one
      // in order to preserve the context for inline redirection
    if (options.topic === '__pre__' || options.topic === '__post__') {
      if (options.user.__history__.topic.length) {
        options.topic = options.user.__history__.topic[0];
      }
    }

    processHelpers.getTopic(options.system.chatSystem, options.topic, (err, topicData) => {
      const messageOptions = {
        factSystem: options.system.factSystem,
      };

      Message.createMessage(target, messageOptions, (replyMessageObject) => {
        debug.verbose('replyMessageObject', replyMessageObject);

        options.pendingTopics = [];
        options.pendingTopics.push(topicData);

        getReply(replyMessageObject, options, (err, subreply) => {
          if (err) {
            console.log(err);
          }

          debug.verbose('subreply', subreply);

          if (subreply) {
            const rd1 = new RegExp(`\\{@${Utils.quotemeta(target)}\\}`, 'i');
            reply = reply.replace(rd1, subreply.string);
            redirectMatch = reply.match(/\{@(.+?)\}/);
          } else {
            redirectMatch = false;
            reply = reply.replace(new RegExp(`\\{@${Utils.quotemeta(target)}\\}`, 'i'), '');
          }

          cb((options.depth === 50) ? 'Depth Error' : null);
        }); // getReply
      }); // Message
    });
  },
    (err) => {
      debug.verbose('CallBack from inline redirect', Utils.trim(reply));
      return callback(err, Utils.trim(reply), options.message.props, {});
    }
  );
};

export default inlineRedirect;
