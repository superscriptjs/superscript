var express         = require('express');
var app             = express();
var session         = require('express-session');
var MongoStore      = require('connect-mongo')(session);
var bodyParser      = require('body-parser');
var twilio          = require('twilio');
var superscript     = require("superscript");
var mongoose        = require("mongoose");
var facts           = require("sfacts");
var factSystem      = facts.create('twilioFacts');

// Database
mongoURI = process.env.MONGO_URI || 'mongodb://localhost/superscriptDB';
mongoose.connect(mongoURI);
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
 console.log('Mongodb connection open');
});


// Twilio Configuration
// Number format should be "+19876543210", with "+1" the country code
var config_twilio = {
          account: "[YOUR_TWILIO_SID]",
          token: "[YOUR_TWILIO_TOKEN]",
          number: "[YOUR_TWILIO_NUMBER]"
        } 

var accountSid = process.env.TWILIO_SID || config_twilio.account;
var authToken = process.env.TWILIO_AUTH || config_twilio.token;
var twilioNum = process.env.NUM || config_twilio.number;

twilio.client = twilio(accountSid, authToken);
twilio.handler = twilio;
twilio.authToken = authToken;
twilio.num = twilioNum;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'cellar door',
    resave: true, 
    saveUninitialized: false, 
    store: new MongoStore({mongooseConnection: db })
}));

// PORT
var port = process.env.PORT || 3000;

// START SERVER
var server = app.listen(port, function() {
  console.log('Listening on:' + port);
});

var options = {};

options['factSystem'] = factSystem;
options['mongoose'] = mongoose;


// TWILIO
// In your Twilio account, set up Twilio Messaging "Request URL" as HTTP POST
// If running locally and using ngrok, should look something like: http://b2053b5e.ngrok.io/api/messages
var botHandle = function(err, bot) {
  app.post('/api/messages', function(req, res) {
    if (twilio.handler.validateExpressRequest(req, twilio.authToken)) {
      console.log("Twilio Message Received: " + req.body.Body)
      dataHandle(req.body.Body, req.body.From, twilio.num, bot);
    } else {
      res.set('Content-Type', 'text/xml').status(403).send("Error handling text messsage. Check your request params");
    }
   
  });
};

var dataHandle = function(data, phoneNumber, twilioNumber, bot) {
    // Format message
    var message = "" + data;

    message = message.replace(/[\x0D\x0A]/g, "");

    bot.reply(message.trim(), function(err, reply){
        sendSMS(phoneNumber, twilioNumber, reply.string);
    });
};

// Send Twilio text message
var sendSMS = function (recipient, sender, message) {
  twilio.client.messages.create({ 
      to: recipient, 
      from: sender, 
      body: message, 
  }, function(err, result) { 
      if (!err) {
        console.log('Reply sent! The SID for this message is: ')
        console.log(result.sid);
        console.log('Message sent on')
        console.log(result.dateCreated)
      } else {
        console.log("Error sending message");
        console.log(err);
      } 
  });
};

// Main entry point
new superscript(options, function(err, botInstance){
  botHandle(null, botInstance);
});
