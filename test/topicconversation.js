/* global describe, it, before, after */

import mocha from 'mocha';
import should from 'should/as-function';
import helpers from './helpers';
import { doesMatch, doesMatchTopic } from '../src/bot/getReply/helpers';


// Testing topics that include and mixin other topics.
describe('SuperScript TopicsConversation', () => {
  before(helpers.before('topicconversation'));

  describe('TopicConversationPets', () => {
    it('Conversation begin', (done) => {
      helpers.getBot().reply('tc_user', 'i love pets', (err, reply) => {
        should('Me too, what is your favorite?').eql(reply.string);
        done();
      });
    });

    it('Inside the pets topic', (done) => {
      helpers.getBot().reply('tc_user', 'mine is cat', (err, reply) => {
        should(reply.string).eql('I love it too, what is your favorite ?');
        done();
      });
    });

    it('Should remain in the pets topic', (done) => {
      helpers.getBot().reply('tc_user', 'whatever', (err, reply) => {
        should(reply.string).eql('Cats are fun');
        done();
      });
    });

  });

  describe('TopicConversationAnimals', () => {
    it('Conversation begin', (done) => {
      helpers.getBot().reply('tc_user', 'i love animals', (err, reply) => {
        should('I don\'t like pets, what is your favorite?').eql(reply.string);
        done();
      });
    });

    it('Inside the pets topic', (done) => {
      helpers.getBot().reply('tc_user', 'mine is cat', (err, reply) => {
        should(reply.string).eql('Cats are scary, what is your favorite?');
        done();
      });
    });

    it('Should remain in the pets topic', (done) => {
      helpers.getBot().reply('tc_user', 'whatever', (err, reply) => {
        should(reply.string).eql('Cats are scary');
        done();
      });
    });

  });

  after(helpers.after);
});
