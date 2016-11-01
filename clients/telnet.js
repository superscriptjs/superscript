// Run this and then telnet to localhost:2000 and chat with the bot

import net from 'net';
import SuperScript from 'superscript';

const sockets = [];

const botHandle = function botHandle(err, bot) {
  const receiveData = function receiveData(socket, bot, data) {
    // Handle incoming messages.
    let message = `${data}`;

    message = message.replace(/[\x0D\x0A]/g, '');

    if (message.indexOf('/quit') === 0 || data.toString('hex', 0, data.length) === 'fff4fffd06') {
      socket.end('Good-bye!\n');
      return;
    }

    // Use the remoteIP as the name since the PORT changes on ever new connection.
    bot.reply(socket.remoteAddress, message.trim(), (err, reply) => {
      // Find the right socket
      const i = sockets.indexOf(socket);
      const soc = sockets[i];

      soc.write(`\nBot> ${reply.string}\n`);
      soc.write('You> ');
    });
  };

  const closeSocket = function closeSocket(socket, bot) {
    const i = sockets.indexOf(socket);
    const soc = sockets[i];

    console.log(`User '${soc.name}' has disconnected.\n`);

    if (i !== -1) {
      sockets.splice(i, 1);
    }
  };

  const newSocket = function newSocket(socket) {
    socket.name = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`User '${socket.name}' has connected.\n`);

    sockets.push(socket);

    // Send a welcome message.
    socket.write('Welcome to the Telnet server!\n');
    socket.write(`Hello ${socket.name}! ` + `Type /quit to disconnect.\n\n`);

    // Send their prompt.
    socket.write('You> ');

    socket.on('data', (data) => {
      receiveData(socket, bot, data);
    });

    // Handle disconnects.
    socket.on('end', () => {
      closeSocket(socket, bot);
    });
  };

  // Start the TCP server.
  const server = net.createServer(newSocket);

  server.listen(2000);
  console.log('TCP server running on port 2000.\n');
};

// This assumes the topics have been compiled to data.json first
// See superscript/src/bin/parse for information on how to do that.

// Main entry point
const options = {
  factSystem: {
    clean: true,
  },
  importFile: './data.json',
};

SuperScript(options, (err, bot) => {
  botHandle(null, bot);
});
