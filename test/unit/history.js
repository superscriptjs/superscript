import mocha from 'mocha';
import should from 'should';

import History from '../../src/bot/history';
import Message from '../../src/bot/message';
import connect from '../../src/bot/db/connect';
import createFactSystem from '../../src/bot/factSystem';
import createChatSystem from '../../src/bot/chatSystem';

describe.skip('History Lookup Interface', () => {
  let user;
  let factSystem;

  before((done) => {
    const db = connect('mongodb://localhost/', 'testHistory');
    const data = [
      // './data/names.top'
    ];
    const options = {
      name: 'testHistoryFacts',
      clean: true,
      importData: data,
    };
    createFactSystem(options, (err, facts) => {
      factSystem = facts;
      const chatSystem = createChatSystem(db, factSystem);
      const findProps = { id: 'testuser' };
      const createProps = {
        currentTopic: 'random',
        status: 0,
        conversation: 0,
        volley: 0,
        rally: 0,
      };
      chatSystem.User.findOrCreate(findProps, createProps, (err, newUser) => {
        user = newUser;
        done();
      });
    });
  });

  it('simple history recall', (done) => {
    Message.createMessage('I have two sons', { factSystem }, (msgObj) => {
      user.updateHistory(msgObj, '');
      Message.createMessage('How many sons do I have?', { factSystem }, (msgObj2) => {
        const h = History(user, { nouns: msgObj2.nouns });
        h.length.should.eql(1);
        h[0].numbers[0].should.eql('2');
        done();
      });
    });
  });

  it('money history recall', (done) => {
    Message.createMessage('I have twenty-five bucks in my wallet', { factSystem }, (msgObj) => {
      Message.createMessage('I ate a 3 course meal to days ago, it was amazing.', { factSystem }, (msgObjx) => {
        user.updateHistory(msgObj, '');
        user.updateHistory(msgObjx, '');

        Message.createMessage('How much money do I have?', { factSystem }, (msgObj2) => {
          const h = History(user, { money: true });

          h.length.should.eql(1);
          h[0].numbers[0].should.eql('25');
          done();
        });
      });
    });
  });

  it('money history recall with noun filter', (done) => {
    Message.createMessage('A loaf of bread cost $4.50', { factSystem }, (msgObj) => {
      Message.createMessage('A good bike cost like $1,000.00 bucks.', { factSystem }, (msgObjx) => {
        user.updateHistory(msgObj, '');
        user.updateHistory(msgObjx, '');

        Message.createMessage('How much is a loaf of bread?', { factSystem }, (msgObj2) => {
          const h = History(user, { money: true, nouns: msgObj2.nouns });
          h.length.should.eql(1);
          h[0].numbers[0].should.eql('4.50');
          done();
        });
      });
    });
  });


  it('date history recall', (done) => {
    Message.createMessage('next month is important', { factSystem }, (msgObj) => {
      user.updateHistory(msgObj, '');
      Message.createMessage('When is my birthday?', { factSystem }, (msgObj2) => {
        const h = History(user, { date: true });
        h.length.should.eql(1);
        // date should be a moment object
        h[0].date.format('MMMM').should.eql('July');
        done();
      });
    });
  });

  // Name lookup with QType Resolver (ENTY:sport)
  // My friend Bob likes to play tennis. What game does Bob like to play?
  // What is the name of my friend who likes to play tennis?
  it('memory problem 1', (done) => {
    Message.createMessage('My friend Bob likes to play tennis.', { factSystem }, (msgObj) => {
      user.updateHistory(msgObj, '');
      Message.createMessage('What game does Bob like to play?', { factSystem }, (msgObj2) => {
        // AutoReply ENTY:Sport
        const h = History(user, { nouns: msgObj2.nouns });
        h.length.should.eql(1);
        cnet.resolveFacts(h[0].cNouns, 'sport', (err, res) => {
          res.length.should.eql(1);
          res[0].should.eql('tennis');

          // update the history with the new msg obj.
          user.updateHistory(msgObj2, '');

          Message.createMessage('What is the name of my friend who likes to play tennis?', { factSystem }, (msgObj3) => {
            const h2 = History(user, { nouns: msgObj3.nouns });
            h2.length.should.eql(1);
            h2[0].names[0].should.eql('Bob');
            done();
          });
        });
      });
    });
  });

  // My friend John likes to fish for trout.  What does John like to fish for?
  // What is the name of my friend who fishes for trout?
  it('memory problem 2', (done) => {
    Message.createMessage('My friend John likes to fish for trout.', { factSystem }, (msgObj) => {
      user.updateHistory(msgObj, '');
      Message.createMessage('What does John like to fish for?', { factSystem }, (msgObj2) => {
        const h = History(user, { nouns: msgObj2.nouns });
        h.length.should.eql(1);
        cnet.resolveFacts(h[0].cNouns, 'food', (err, res) => {
          res.length.should.eql(2);
          res.should.containEql('fish');
          res.should.containEql('trout');
          Message.createMessage('What is the name of my friend who fishes for trout?', { factSystem }, (msgObj3) => {
            const h2 = History(user, { nouns: msgObj3.nouns });
            h2[0].names[0].should.eql('John');
            done();
          });
        });
      });
    });
  });

  // The ball was hit by Bill. What did Bill hit?
  // Who hit the ball?
  it('memory problem 3', (done) => {
    Message.createMessage('The ball was hit by Jack.', { factSystem }, (msgObj) => {
      user.updateHistory(msgObj, '');
      Message.createMessage('What did Jack hit?', { factSystem }, (msgObj2) => {
        const h = History(user, { nouns: msgObj2.nouns });
        h.length.should.eql(1);
        // Answer types is WHAT, the answer is in the cnouns
        h[0].cNouns[0].should.eql('ball');

        // Follow up question: Who hit the ball?
        Message.createMessage('Who hit the ball?', { factSystem }, (msgObj3) => {
          // We know this is a HUM:ind, give me a name!
          const h = History(user, { nouns: msgObj3.nouns });
          h[0].names[0].should.eql('Jack');
          done();
        });
      });
    });
  });
});
