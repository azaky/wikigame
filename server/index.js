const http = require('http');
const express = require('express');
const cors = require('cors');
const socketio = require('socket.io');
const game = require('./game');
const util = require('./util');
const package = require('./package.json');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketio(server);

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Wikigame', version: package.version });
});

app.use('/game', game.handler);

io.use((socket, next) => {
  console.log('Query: ', socket.handshake.query);
  if (!socket.handshake.query.username) {
    console.log('no username');
    return next(new Error('username is required'));
  }
  if (socket.handshake.query.lang) {
    if (!util.isLanguageValid(socket.handshake.query.lang)) {
      console.log('invalid lang:', socket.handshake.query.lang);
      return next(new Error('invalid language'));
    }
  }
  return next();
});

io.on('connection', game.socketHandler);

const port = process.env.PORT || 9454;
server.listen(port, () => {
  console.log(`Wikigame server listening on port ${port}`);
});
