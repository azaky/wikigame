const util = require('./util');

let rooms = [];

const existsRoomById = id => rooms.findIndex(room => room.roomId === id) !== -1;
const getRoomById = id => rooms.find(room => room.roomId === id);

// up to 5 digit room id
const generateRoomId = () => `${Math.round(Math.random() * 100000)}`;

const createRoom = (host, id) => {
  if (!id) {
    do {
      id = generateRoomId();
    } while (existsRoomById(id));
  }
  let room = {
    roomId: id,
    url: `https://en.wikipedia.org/wiki/Main_Page?roomId=${encodeURIComponent(id)}`,
    host,
    state: 'lobby',
    players: [host],
    currentRound: {
      start: '',
      target: '',
      started: false,
    },
    currentState: {},
    rules: {
      timeLimit: 120,
      metrics: 'clicks',
      allowCtrlf: true,
      allowDisambiguation: true,
      bannedArticles: [],
    },
    leaderboard: [
      {
        username: host,
        score: 0,
      },
    ],
    pastRounds: [],
  };
  rooms.push(room);
  return room;
};

const generateCurrentRoundResult = room => {
  room.currentRound.result = Object.keys(room.currentState).map(username => ({
    username,
    finished: room.currentState[username].finished,
    clicks: room.currentState[username].clicks,
    timeTaken: room.currentState[username].timeTaken,
    score: room.currentState[username].score
  }));
  return room.currentRound.result;
};

const calculateScore = (state, rules) => {
  let scoreClicks = 10 * (11 - Math.min(10, state.clicks));
  let scoreTime = Math.ceil(100 * (1 - state.timeTaken/rules.timeLimit));
  if (rules.metrics === 'clicks') {
    return scoreClicks;
  } else if (rules.metrics === 'time') {
    return scoreTime;
  } else if (rules.metrics === 'combined') {
    return Math.ceil((scoreClicks + scoreTime) / 2);
  } else {
    console.warn(`Invalid scoring metrics: ${rules.metrics}, will fallback to clicks`);
    return scoreClicks;
  }
};

const calculateLeaderboard = room => {
  Object.keys(room.currentState).forEach(username => {
    let score = room.currentState[username].score || 0;
    let p = room.leaderboard.find(l => l.username === username);
    if (!p) {
      room.leaderboard.push({username, score});
    } else {
      p.score += score;
    }
  });
  room.leaderboard.sort((a, b) => b.score - a.score);
  return room.leaderboard;
};

const handler = socket => {
  console.log('a user connected!');
  console.log(socket.handshake.query);
  let {username, roomId} = socket.handshake.query;

  let room;
  if (!roomId || !existsRoomById(roomId)) {
    room = createRoom(username, roomId);
  } else {
    room = getRoomById(roomId);
  }

  // TODO: check username duplicates on the same room

  if (!room.players.find(p => p == username)) {
    // special case of orphaned room, set self as host
    if (!room.players.length) {
      room.host = username;
    }

    room.players.push(username);
    // push to current leaderboard if currently a game is active
    if (room.state === 'playing') {
      room.currentRound.result = room.currentRound.result.filter(result => result.username !== username);
      room.currentRound.result.push({
        username,
        finished: false,
        clicks: 0,
        timeTaken: 0,
        score: 0,
      });
      room.currentState[username] = {
        path: [room.currentRound.start],
        clicks: 0,
        finished: false,
        timeTaken: 0,
        score: 0,
      };
    }
    if (!room.leaderboard.find(l => l.username === username)) {
      room.leaderboard.push({
        username,
        score: 0,
      });
    }
  }

  socket.join(room.roomId, err => {
    if (err) {
      return console.error(`Error joining room ${room.roomId}:`, err);
    }
    console.log(`[room=${room.roomId}] [${username}] joined room!`);
  });

  socket.emit('init', {
    roomId: room.roomId,
    url: room.url,
    host: room.host,
    state: room.state,
    players: room.players,
    currentRound: room.currentRound,
    rules: room.rules,
    leaderboard: room.leaderboard,
    lastRound: room.pastRounds.slice(-1)[0],
    currentState: room.currentState[username],
  });
  // broadcast others that a new player joins
  socket.to(room.roomId).emit('update', {
    players: room.players,
    currentRound: room.currentRound,
    leaderboard: room.leaderboard,
  });

  // update rules etc.
  socket.on('update', (data, ack) => {
    if (room.host !== username) {
      console.log(`[room=${room.roomId}] [${username}] is not host and attempted to perform update, ignoring`);
      return;
    }
    console.log(`[room=${room.roomId}] [${username}] updates data:`, data);

    // TODO: perform validation to data
    util.mergeDeep(room, data);

    // broadcast changes, and only the changes (not the whole data)
    socket.to(room.roomId).emit('update', data);
    socket.emit('update', data);
  });

  let ticker, countdown;

  const onFinished = () => {
    if (room.state !== 'playing') return;
    clearTimeout(countdown);
    clearInterval(ticker);

    console.log(`[room=${room.roomId}] [${username}] round finished!`);

    room.state = 'lobby';
    calculateLeaderboard(room);
    room.pastRounds.push({
      start: room.currentRound.start,
      target: room.currentRound.target,
      result: room.currentRound.result.map(res => Object.assign({}, res, {path: room.currentState[res.username].path})),
    });
    room.currentRound = {
      start: room.currentRound.start,
      target: room.currentRound.target,
      started: false,
    };
    room.currentState = {};

    let finishedState = {
      state: room.state,
      currentRound: room.currentRound,
      leaderboard: room.leaderboard,
      lastRound: room.pastRounds.slice(-1)[0],
    };
    socket.to(room.roomId).emit('finished', finishedState);
    socket.emit('finished', finishedState);
  };

  // start game
  socket.on('start', (data, ack) => {
    if (room.host !== username) {
      console.log(`[room=${room.roomId}] [${username}] is not host and attempted to perform start, ignoring`);
      return;
    }
    console.log(`[room=${room.roomId}] [${username}] starts round!`);

    if (room.currentRound.started) {
      console.log(`[room=${room.roomId}] [${username}] attempted to perform start, but round is already started, ignoring`);
      return;
    }

    room.state = 'playing';
    Object.assign(room.currentRound, {
      started: true,
      startTimestamp: new Date().getTime(),
      timeLeft: room.rules.timeLimit,
    });

    room.currentState = {};
    let currentState = {
      path: [room.currentRound.start],
      clicks: 0,
      finished: false,
      timeTaken: 0,
      score: 0,
    };
    room.players.forEach(player => room.currentState[player] = JSON.parse(JSON.stringify(currentState)));

    generateCurrentRoundResult(room);

    ticker = setInterval(() => {
      room.currentRound.timeLeft = room.rules.timeLimit - Math.ceil((new Date().getTime() - room.currentRound.startTimestamp) / 1000);
      if (room.currentRound.timeLeft > 0) {
        console.log(`[room=${room.roomId}] ticker: timeLeft=${room.currentRound.timeLeft}`);
        socket.to(room.roomId).emit('update', {currentRound: {timeLeft: room.currentRound.timeLeft}});
        socket.emit('update', {currentRound: {timeLeft: room.currentRound.timeLeft}});
      } else {
        clearInterval(ticker);
        // on finish is handled by countdown
      }
    }, 1000);

    countdown = setTimeout(() => {
      onFinished();
    }, 1000 * room.rules.timeLimit);

    // since the start state is the same for all players, we can safely broadcast currentState
    let startData = {
      state: room.state,
      currentState,
      currentRound: room.currentRound,
    };
    socket.to(room.roomId).emit('start', startData);
    socket.emit('start', startData);
  });

  socket.on('click', (data, ack) => {
    const {article} = data;
    console.log(`[room=${room.roomId}] [${username}] is clicking ${article}`);

    if (room.state !== 'playing' || room.currentState[username].finished) {
      return ack({valid: false});
    }

    if (room.rules.bannedArticles.includes(article)) {
      return ack({valid: false, message: `${article} is banned! You can't go there!`});
    }

    // TODO: validation?
    room.currentState[username].path.push(article);
    room.currentState[username].clicks++;

    // win condition checks
    if (article === room.currentRound.target) {
      room.currentState[username].finished = true;
      room.currentState[username].timeTaken = Math.ceil((new Date().getTime() - room.currentRound.startTimestamp) / 1000);
      room.currentState[username].score = calculateScore(room.currentState[username], room.rules);
    }

    generateCurrentRoundResult(room);

    ack({valid: true, currentState: room.currentState[username]});

    socket.to(room.roomId).emit('update', {currentRound: room.currentRound});
    socket.emit('update', {currentRound: room.currentRound});

    // check if all players win
    let allWin = true;
    room.players.forEach(player => {
      if (room.currentState[player] && !room.currentState[player].finished) {
        allWin = false;
      }
    });
    if (allWin) {
      onFinished();
    }
  });

  socket.on('disconnect', () => {
    console.log(`[room=${room.roomId}] [${username}] disconnected!`);

    room.players = room.players.filter(p => p !== username);

    // disband room when there's no player
    if (!room.players.length) return;

    // transfer host
    if (room.host === username) {
      room.host = room.players[0];
    }

    socket.to(room.roomId).emit('update', {host: room.host, players: room.players});
  });
};

module.exports = {
  handler,
};
