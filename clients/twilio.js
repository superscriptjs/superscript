import express from 'express';
import session from 'express-session';
import connectMongo from 'connect-mongo';
import bodyParser from 'body-parser';
import twilio from 'twilio';
import SuperScript from 'superscript';

const app = express();
const MongoStore = connectMongo(session);

// Twilio Configuration
// Number format should be "+19876543210", with "+1" the country code
const twilioConfig = {
  account: '[YOUR_TWILIO_SID]',
  token: '[YOUR_TWILIO_TOKEN]',
  number: '[YOUR_TWILIO_NUMBER]',
};

const accountSid = process.env.TWILIO_SID || twilioConfig.account;
const authToken = process.env.TWILIO_AUTH || twilioConfig.token;
const twilioNum = process.env.NUM || twilioConfig.number;

twilio.client = twilio(accountSid, authToken);
twilio.handler = twilio;
twilio.authToken = authToken;
twilio.num = twilioNum;

// Send Twilio text message
const sendSMS = function sendSMS(recipient, sender, message) {
  twilio.client.messages.create({
    to: recipient,
    from: sender,
    body: message,
  }, (err, result) => {
    if (!err) {
      console.log('Reply sent! The SID for this message is: ');
      console.log(result.sid);
      console.log('Message sent on');
      console.log(result.dateCreated);
    } else {
      console.log('Error sending message');
      console.log(err);
    }
  });
};

const dataHandle = function dataHandle(data, phoneNumber, twilioNumber, bot) {
    // Format message
  let message = `${data}`;

  message = message.replace(/[\x0D\x0A]/g, '');

  bot.reply(message.trim(), (err, reply) => {
    sendSMS(phoneNumber, twilioNumber, reply.string);
  });
};

// TWILIO
// In your Twilio account, set up Twilio Messaging "Request URL" as HTTP POST
// If running locally and using ngrok, should look something like: http://b2053b5e.ngrok.io/api/messages
const botHandle = function (err, bot) {
  app.post('/api/messages', (req, res) => {
    if (twilio.handler.validateExpressRequest(req, twilio.authToken)) {
      console.log(`Twilio Message Received: ${req.body.Body}`);
      dataHandle(req.body.Body, req.body.From, twilio.num, bot);
    } else {
      res.set('Content-Type', 'text/xml').status(403).send('Error handling text messsage. Check your request params');
    }
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
  // Middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(session({
    secret: 'cellar door',
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: bot.db }),
  }));

  // PORT
  const port = process.env.PORT || 3000;

  // START SERVER
  app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
  });

  botHandle(null, bot);
});
