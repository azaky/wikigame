const express = require('express');
const cors = require('cors');
const socketio = require('socket.io');
const game = require('./game');

const app = express();
app.use(cors());
app.use(express.json());

const http = require('http').createServer(app);
const io = socketio(http);

app.get('/', (req, res) => {
  res.json({message: 'Hello from Wikigame'});
});

io.use((socket, next) => {
  console.log("Query: ", socket.handshake.query);
  if (!socket.handshake.query.username) {
    console.log('no username');
    return next(new Error('username is required'));
  }
  return next();
});

io.on('connection', game.handler);

const port = process.env.PORT || 9454;
http.listen(port, () => {
  console.log(`Wikigame server listening on port ${port}`);
});
