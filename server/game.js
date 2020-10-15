const fetch = require('node-fetch');
const express = require('express');
const util = require('./util');

const rooms = [];

const existsRoomById = (id) => rooms.findIndex((room) => room.roomId === id) !== -1;
const getRoomById = (id) => rooms.find((room) => room.roomId === id);

// up to 5 digit room id
const generateRoomId = () => `${Math.round(Math.random() * 100000)}`;

const createRoom = (host, id) => {
  let roomId = id;
  if (!roomId) {
    do {
      roomId = generateRoomId();
    } while (existsRoomById(roomId));
  }
  const room = {
    roomId,
    url: `https://en.wikipedia.org/wiki/Main_Page?roomId=${encodeURIComponent(roomId)}`,
    host,
    state: 'lobby',
    players: [],
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

const generateCurrentRoundResult = (room) => {
  room.currentRound.result = Object.keys(room.currentState).map((username) => ({
    username,
    finished: room.currentState[username].finished,
    clicks: room.currentState[username].clicks,
    timeTaken: room.currentState[username].timeTaken,
    score: room.currentState[username].score,
  }));
  return room.currentRound.result;
};

const calculateScore = (state, rules) => {
  const scoreClicks = 10 * (11 - Math.min(10, state.clicks));
  const scoreTime = Math.ceil(100 * (1 - state.timeTaken / rules.timeLimit));
  if (rules.metrics === 'clicks') {
    return scoreClicks;
  } if (rules.metrics === 'time') {
    return scoreTime;
  } if (rules.metrics === 'combined') {
    return Math.ceil((scoreClicks + scoreTime) / 2);
  }
  console.warn(`Invalid scoring metrics: ${rules.metrics}, will fallback to clicks`);
  return scoreClicks;
};

const calculateLeaderboard = (room) => {
  Object.keys(room.currentState).forEach((username) => {
    const score = room.currentState[username].score || 0;
    const p = room.leaderboard.find((l) => l.username === username);
    if (!p) {
      room.leaderboard.push({ username, score });
    } else {
      p.score += score;
    }
  });
  room.leaderboard.sort((a, b) => b.score - a.score);
  return room.leaderboard;
};

/*
   on valid articles, this return:

   {
     found: true,
     type: standard | disambiguation | no-extract (category included),
     title: <canonical title>,
     normalizedTitle: <normalized title>,
     thumbnail: <url to thumbnail>,
   }

   on invalid articles, this returns { found: false }
*/
// TODO: cache this for God's sake
const validateArticle = async (title) => {
  try {
    if (!title) return { found: false };
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    const body = await response.json();
    if (body.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') {
      return { found: false };
    }
    return {
      found: true,
      type: body.type,
      title: body.titles.canonical,
      normalizedTitle: body.titles.normalized,
      thumbnail: (body.thumbnail && body.thumbnail.source) || '',
    };
  } catch (e) {
    console.error(`Error validating article [${title}]:`, e);
    return { found: false };
  }
};

const validateArticles = async (titles) => Promise.all(titles.map(validateArticle));

const getElapsedTime = (start) => Math.ceil((new Date().getTime() - start) / 1000);

const socketHandler = async (socket) => {
  console.log('a user connected!');
  console.log(socket.handshake.query);
  const { username, roomId } = socket.handshake.query;

  let room;
  if (!roomId || !existsRoomById(roomId)) {
    room = createRoom(username, roomId);
  } else {
    room = getRoomById(roomId);
  }

  // check if there's a duplicate username
  if (room.players.find((p) => p === username)) {
    console.log(`[room=${room.roomId}] duplicated username: ${username}`);
    socket.emit('init_error', {
      message: `Duplicated username ${username} found, pick another one!`,
    });
    socket.disconnect(true);
    return;
  }

  // special case of orphaned room, set self as host
  if (!room.players.length) {
    room.host = username;
  }

  room.players.push(username);
  // push to current leaderboard if currently a game is active
  if (room.state === 'playing') {
    room.currentRound.result = room.currentRound.result.filter(
      (result) => result.username !== username,
    );
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
  if (!room.leaderboard.find((l) => l.username === username)) {
    room.leaderboard.push({
      username,
      score: 0,
    });
  }

  socket.join(room.roomId, (err) => {
    if (err) {
      console.error(`Error joining room ${room.roomId}:`, err);
      return;
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
  // broadcast notification separately
  socket.to(room.roomId).emit('notification', {
    message: `${username} has joined the room!`,
  });

  // update rules etc.
  socket.on('update', async (data, ack) => {
    if (room.host !== username) {
      console.log(`[room=${room.roomId}] [${username}] is not host and attempted to perform update, ignoring`);
      ack({
        success: false,
        message: 'You must be a host to perform update',
      });
      return;
    }
    if (room.currentRound.started) {
      console.log(`[room=${room.roomId}] [${username}] attempted to perform update when round already started, ignoring`);
      ack({
        success: false,
        message: 'Cannot update a round that has started',
      });
      return;
    }

    console.log(`[room=${room.roomId}] [${username}] updates data:`, data);

    if (data.host) {
      if (!room.players.includes(data.host)) {
        console.log(`[room=${room.roomId}] [${username}] attempted to transfer host to nonexistent (or perhaps offline) player, ignoring`);
        ack({
          success: false,
          message: 'Cannot only transfer host to online players',
        });
        return;
      }
    }

    if (data.currentRound && data.currentRound.start) {
      const validated = await validateArticle(data.currentRound.start);
      if (validated.found) {
        if (validated.type === 'disambiguation') {
          ack({
            success: false,
            message: 'Start article cannot be a disambiguation page',
          });
          return;
        }
        data.currentRound.start = validated.title;
        data.currentRound.startThumbnail = validated.thumbnail;
      } else {
        data.currentRound.start = '';
        data.currentRound.startThumbnail = '';
      }
    }
    if (data.currentRound && data.currentRound.target) {
      const validated = await validateArticle(data.currentRound.target);
      if (validated.found) {
        if (validated.type === 'disambiguation') {
          ack({
            success: false,
            message: 'Target article cannot be a disambiguation page',
          });
          return;
        }
        data.currentRound.target = validated.title;
        data.currentRound.targetThumbnail = validated.thumbnail;
      } else {
        data.currentRound.target = '';
        data.currentRound.targetThumbnail = '';
      }
    }
    if (data.rules && data.rules.bannedArticles) {
      const validated = await validateArticles(data.rules.bannedArticles);
      data.rules.bannedArticles = validated.filter((v) => v.found).map((v) => v.title);
    }

    // we've been through a lot. other events may happen while we're resolving everything
    // do not forget to recheck whether the round has started or not
    if (room.currentRound.started) {
      console.log(`[room=${room.roomId}] [${username}] attempted to perform update when round already started, ignoring`);
      ack({
        success: false,
        message: 'Cannot update a round that has started',
      });
      return;
    }

    // TODO: perform validation to data
    util.mergeDeep(room, data);

    // broadcast changes, and only the changes (not the whole data)
    ack({ success: true, data });
    socket.to(room.roomId).emit('update', data);
  });

  let ticker;
  let countdown;

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
      result: room.currentRound.result.map((res) => ({
        ...res,
        path: room.currentState[res.username].path,
      })),
    });
    room.currentRound = {
      start: room.currentRound.start,
      target: room.currentRound.target,
      started: false,
    };
    room.currentState = {};

    const finishedState = {
      state: room.state,
      currentRound: room.currentRound,
      leaderboard: room.leaderboard,
      lastRound: room.pastRounds.slice(-1)[0],
    };
    socket.to(room.roomId).emit('finished', finishedState);
    socket.emit('finished', finishedState);
  };

  // start game
  socket.on('start', (_, ack) => {
    if (room.host !== username) {
      console.log(`[room=${room.roomId}] [${username}] is not host and attempted to perform start, ignoring`);
      return;
    }
    console.log(`[room=${room.roomId}] [${username}] starts round!`);

    if (room.currentRound.started) {
      console.log(`[room=${room.roomId}] [${username}] attempted to perform start, but round is already started, ignoring`);
      return;
    }

    // round config checks
    if (!room.currentRound.start) {
      ack({
        success: false,
        message: 'Start article must not be empty!',
      });
      return;
    }
    if (!room.currentRound.target) {
      ack({
        success: false,
        message: 'Target article must not be empty!',
      });
      return;
    }
    if (room.rules.bannedArticles.includes(room.currentRound.start)) {
      ack({
        success: false,
        message: 'Start article must not be banned!',
      });
      return;
    }
    if (room.rules.bannedArticles.includes(room.currentRound.target)) {
      ack({
        success: false,
        message: 'Target article must not be banned!',
      });
      return;
    }

    room.state = 'playing';
    Object.assign(room.currentRound, {
      started: true,
      startTimestamp: new Date().getTime(),
      timeLeft: room.rules.timeLimit,
    });

    room.currentState = {};
    const currentState = {
      path: [room.currentRound.start],
      clicks: 0,
      finished: false,
      timeTaken: 0,
      score: 0,
    };
    room.players.forEach((player) => {
      room.currentState[player] = JSON.parse(JSON.stringify(currentState));
    });

    generateCurrentRoundResult(room);

    ticker = setInterval(() => {
      const elapsed = getElapsedTime(room.currentRound.startTimestamp);
      room.currentRound.timeLeft = room.rules.timeLimit - elapsed;
      if (room.currentRound.timeLeft > 0) {
        console.log(`[room=${room.roomId}] ticker: timeLeft=${room.currentRound.timeLeft}`);
        socket.to(room.roomId).emit('update', { currentRound: { timeLeft: room.currentRound.timeLeft } });
        socket.emit('update', { currentRound: { timeLeft: room.currentRound.timeLeft } });
      } else {
        clearInterval(ticker);
        // on finish is handled by countdown
      }
    }, 1000);

    countdown = setTimeout(() => {
      onFinished();
    }, 1000 * room.rules.timeLimit);

    // since the start state is the same for all players, we can safely broadcast currentState
    const startData = {
      state: room.state,
      currentState,
      currentRound: room.currentRound,
    };

    ack({ success: true, data: startData });
    socket.to(room.roomId).emit('start', startData);
  });

  socket.on('click', async (data, ack) => {
    console.log(`[room=${room.roomId}] [${username}] is clicking ${data.article}`);

    if (room.state !== 'playing' || room.currentState[username].finished) {
      ack({ success: false });
      return;
    }

    // resolve article, including redirects etc.
    const validated = await validateArticle(data.article);
    if (!validated.found) {
      ack({ success: false });
      return;
    }
    const article = validated.title;

    if (room.rules.bannedArticles.includes(article)) {
      ack({ success: false, message: `${article} is banned! You can't go there!` });
      return;
    }

    if (!room.rules.allowDisambiguation && validated.type === 'disambiguation') {
      ack({ success: false, message: `${article} is a disambiguation page! You can't go there!` });
      return;
    }

    // Double articles checks
    // Since clicking improvement in client side, perhaps we don't need really this.
    // However, there's no harm in more precaution (other than the slight advantage to users)
    if (room.currentState[username].path.slice(-1)[0] !== article) {
      room.currentState[username].path.push(article);
      room.currentState[username].clicks++;
    }

    // win condition checks
    if (article === room.currentRound.target) {
      room.currentState[username].finished = true;
      room.currentState[username].timeTaken = getElapsedTime(room.currentRound.startTimestamp);
      room.currentState[username].score = calculateScore(room.currentState[username], room.rules);
    }

    generateCurrentRoundResult(room);

    ack({
      success: true,
      data: room.currentState[username],
    });

    socket.to(room.roomId).emit('update', { currentRound: room.currentRound });
    socket.emit('update', { currentRound: room.currentRound });

    // notify other users when we've finished
    if (room.currentState[username].finished) {
      socket.to(room.roomId).emit('notification', {
        message: `${username} finished with score ${room.currentState[username].score}!`,
      });
    }

    // check if all players win
    let allWin = true;
    room.players.forEach((player) => {
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

    room.players = room.players.filter((p) => p !== username);

    // disband room when there's no player
    if (!room.players.length) {
      const index = rooms.findIndex((_room) => _room.roomId === room.roomId);
      if (index !== -1) {
        rooms.splice(index, 1);
      }
      return;
    }

    // transfer host
    if (room.host === username) {
      room.host = room.players[0];
    }

    socket.to(room.roomId).emit('update', { host: room.host, players: room.players });
    socket.to(room.roomId).emit('notification', {
      message: `${username} disconnected from the room`,
    });
  });
};

const handler = () => {
  const router = express.Router();

  // currently these endpoints are enabled for debugging purposes.
  // TODO: add some sort of auth if this endpoint stays.
  router.get('/_/', (req, res) => {
    res.json({ data: rooms });
  });
  router.get('/_/overview', (req, res) => {
    const data = rooms.map((room) => ({
      roomId: room.roomId,
      nPlayers: room.players.length,
      nRounds: room.pastRounds.length,
    }));
    res.json({ data });
  });
  router.get('/_/:roomId', (req, res) => {
    const { roomId } = req.params;
    const game = getRoomById(roomId);
    if (!game) {
      res.status(404);
      res.json({ error: `Room ${roomId} is not found` });
    } else {
      res.json({ data: game });
    }
  });

  return router;
};

module.exports = {
  socketHandler,
  handler: handler(),
};
