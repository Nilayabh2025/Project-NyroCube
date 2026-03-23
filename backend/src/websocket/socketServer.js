const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const env = require('../config/env');

function createSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: env.clientUrl,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-room', ({ token }) => {
      try {
        const payload = verifyToken(token);
        socket.join(`user:${payload.sub}`);
        socket.emit('socket:ready', { joined: true, userId: payload.sub });
      } catch (error) {
        socket.emit('socket:error', { message: 'Socket authentication failed.' });
      }
    });
  });

  return io;
}

module.exports = { createSocketServer };
