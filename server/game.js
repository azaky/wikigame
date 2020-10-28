const fetch = require('node-fetch');
const express = require('express');
const util = require('./util');
const persistence = require('./persistence');

const rooms = [];
const activeConnections = {}; // roomId -> [players]

const existsRoomById = (id) =>
  rooms.findIndex((room) => room.roomId === id) !== -1;
const getRoomById = (id) => rooms.find((room) => room.roomId === id);

// up to 5 digit room id
const randomRoomIdDigits = 6;
const generateRoomId = () => {
  const id = Math.round(Math.random() * Math.pow(10, randomRoomIdDigits));
  return `${id}`.padStart(randomRoomIdDigits, '0');
};

const createRoom = (host, id, _lang, _mode) => {
  const lang = _lang || 'en';
  const mode = _mode || 'multi';
  let roomId = id;
  if (!roomId) {
    do {
      roomId = generateRoomId();
    } while (existsRoomById(roomId));
  }
  const room = {
    roomId,
    mode,
    lang,
    url: `https://${lang}.wikipedia.org/wiki/Main_Page?roomId=${encodeURIComponent(
      roomId
    )}&lang=${lang}`,
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
      metrics: 'time',
      allowCtrlf: true,
      allowDisambiguation: true,
      allowBack: true,
      allowNav: true,
      allowCategory: true,
      allowNote: true,
      showArticlePreview: true,
      bannedArticles: [],
    },
    leaderboard: [
      {
        username: host,
        score: 0,
      },
    ],
    pastRounds: [],
    created: util.now(),
    updated: util.now(),
  };
  rooms.push(room);
  return room;
};

const updateUpdated = (room) => {
  room.updated = util.now();
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
  const scoreTime =
    10 + Math.ceil(90 * (1 - state.timeTaken / rules.timeLimit));
  if (rules.metrics === 'clicks') {
    return scoreClicks;
  }
  if (rules.metrics === 'time') {
    return scoreTime;
  }
  if (rules.metrics === 'combined') {
    return Math.ceil((scoreClicks + scoreTime) / 2);
  }
  console.warn(
    `Invalid scoring metrics: ${rules.metrics}, will fallback to clicks`
  );
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

const getElapsedTime = (start) =>
  Math.ceil((new Date().getTime() - start) / 1000);

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
const validateArticle = async (title, lang) => {
  try {
    if (!title) return { found: false };
    const response = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title
      )}`
    );
    const body = await response.json();
    if (
      body.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found'
    ) {
      return { found: false };
    }
    return {
      found: true,
      type: body.type,
      title: body.titles.canonical,
      normalizedTitle: body.titles.normalized,
      thumbnail: (body.thumbnail && body.thumbnail.source) || '',
      namespace: (body.namespace && body.namespace.id) || 0,
    };
  } catch (e) {
    console.error(`Error validating article [lang=${lang}][${title}]:`, e);
    return { found: false };
  }
};

const validateArticles = async (titles, lang) =>
  Promise.all(titles.map((title) => validateArticle(title, lang)));

const socketHandler = async (socket) => {
  console.log('a user connected!');
  console.log(socket.handshake.query);
  const { query } = socket.handshake;
  const username = query.username || '';
  const mode = query.mode || 'multi';

  let room;
  if (mode === 'single') {
    room = createRoom(username, '', query.lang || 'en', mode);
  } else {
    if (!query.roomId || !existsRoomById(query.roomId)) {
      room = createRoom(username, query.roomId, query.lang || 'en');
    } else {
      room = getRoomById(query.roomId);
    }
  }

  // allow claim connection if there's no active connection under the name
  if (!activeConnections[room.roomId]) {
    activeConnections[room.roomId] = [];
  }
  if (!activeConnections[room.roomId].includes(username)) {
    room.players = room.players.filter((p) => p !== username);
  }

  // check if there's a duplicate username
  if (room.players.find((p) => p === username)) {
    console.log(
      `[room=${room.roomId},lang=${room.lang}] duplicated username: ${username}`
    );
    socket.emit('init_error', {
      message: `Duplicated username ${username} found, pick another one!`,
    });
    socket.disconnect(true);
    return;
  }

  // We're not allowed to join single rooms.
  if (room.mode === 'single' && room.players.length > 0) {
    console.log(
      `[room=${room.roomId},lang=${room.lang}] ${username} attempts to join single room`
    );
    socket.emit('init_error', {
      message: `You cannot join rooms for single game!`,
    });
    socket.disconnect(true);
    return;
  }

  activeConnections[room.roomId].push(username);

  // special case of orphaned room, set self as host
  if (!room.players.length) {
    room.host = username;
  }

  room.players.push(username);
  // push to current leaderboard if currently a game is active
  if (room.state === 'playing') {
    room.currentRound.result = room.currentRound.result.filter(
      (result) => result.username !== username
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
      stack: [room.currentRound.start],
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
    console.log(
      `[room=${room.roomId},lang=${room.lang}] [${username}] joined room!`
    );
  });

  socket.emit('init', {
    roomId: room.roomId,
    mode: room.mode,
    lang: room.lang,
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
      console.log(
        `[room=${room.roomId},lang=${room.lang}] [${username}] is not host and attempted to perform update, ignoring`
      );
      ack({
        success: false,
        message: 'You must be a host to perform update',
      });
      return;
    }
    if (room.currentRound.started) {
      console.log(
        `[room=${room.roomId},lang=${room.lang}] [${username}] attempted to perform update when round already started, ignoring`
      );
      ack({
        success: false,
        message: 'Cannot update a round that has started',
      });
      return;
    }

    console.log(
      `[room=${room.roomId},lang=${room.lang}] [${username}] updates data:`,
      data
    );

    if (data.host) {
      if (!room.players.includes(data.host)) {
        console.log(
          `[room=${room.roomId},lang=${room.lang}] [${username}] attempted to transfer host to nonexistent (or perhaps offline) player, ignoring`
        );
        ack({
          success: false,
          message: 'Cannot only transfer host to online players',
        });
        return;
      }
    }

    if (data.currentRound && data.currentRound.start) {
      const validated = await validateArticle(
        data.currentRound.start,
        room.lang
      );
      if (validated.found) {
        if (validated.type === 'disambiguation') {
          ack({
            success: false,
            message: 'Start article cannot be a disambiguation page',
          });
          return;
        }
        if (validated.namespace !== 0) {
          ack({
            success: false,
            message: 'Start article cannot be a special Wikipedia page',
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
      const validated = await validateArticle(
        data.currentRound.target,
        room.lang
      );
      if (validated.found) {
        if (validated.type === 'disambiguation') {
          ack({
            success: false,
            message: 'Target article cannot be a disambiguation page',
          });
          return;
        }
        if (validated.namespace !== 0) {
          ack({
            success: false,
            message: 'Target article cannot be a special Wikipedia page',
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
      const validated = await validateArticles(
        data.rules.bannedArticles,
        room.lang
      );
      data.rules.bannedArticles = validated
        .filter((v) => v.found)
        .map((v) => v.title);
    }

    // we've been through a lot. other events may happen while we're resolving everything
    // do not forget to recheck whether the round has started or not
    if (room.currentRound.started) {
      console.log(
        `[room=${room.roomId},lang=${room.lang}] [${username}] attempted to perform update when round already started, ignoring`
      );
      ack({
        success: false,
        message: 'Cannot update a round that has started',
      });
      return;
    }

    util.mergeDeep(room, data);

    // broadcast changes, and only the changes (not the whole data)
    ack({ success: true, data });
    socket.to(room.roomId).emit('update', data);
    updateUpdated(room);
  });

  // change language mid game
  socket.on('change_lang', (data, ack) => {
    console.log(
      `[room=${room.roomId},lang=${room.lang}] [${username}] change language:`,
      data
    );

    if (room.host !== username) {
      console.log(
        `[room=${room.roomId},lang=${room.lang}] [${username}] is not host and attempted to perform update, ignoring`
      );
      ack({
        success: false,
        message: 'You must be a host to perform update',
      });
      return;
    }
    if (room.currentRound.started) {
      console.log(
        `[room=${room.roomId},lang=${room.lang}] [${username}] attempted to perform update when round already started, ignoring`
      );
      ack({
        success: false,
        message: 'Cannot update a round that has started',
      });
      return;
    }

    if (!data || !data.lang || !util.isLanguageValid(data.lang)) {
      ack({ success: false, message: 'Invalid language' });
      return;
    }

    if (room.lang === data.lang) {
      ack({
        success: false,
        message: `language is the same as current language`,
      });
      return;
    }

    // we need to reset not only the language, but also the start/target articles
    room.url = `https://${
      data.lang
    }.wikipedia.org/wiki/Main_Page?roomId=${encodeURIComponent(
      room.roomId
    )}&lang=${data.lang}`;
    room.lang = data.lang;
    room.currentRound.start = '';
    room.currentRound.startThumbnail = '';
    room.currentRound.target = '';
    room.currentRound.targetThumbnail = '';
    room.rules.bannedArticles = [];

    // broadcast changes, and only the changes (not the whole data)
    const updateData = {
      url: room.url,
      lang: room.lang,
      currentRound: room.currentRound,
      rules: {
        bannedArticles: room.rules.bannedArticles,
      },
    };
    ack({ success: true, data: { lang: data.lang } });
    socket.emit('update', updateData);
    socket.to(room.roomId).emit('update', updateData);
    updateUpdated(room);
  });

  let ticker;
  let countdown;

  const onFinished = () => {
    if (room.state !== 'playing') return;
    clearTimeout(countdown);
    clearInterval(ticker);

    console.log(
      `[room=${room.roomId},lang=${room.lang}] [${username}] round finished!`
    );

    room.state = 'lobby';
    calculateLeaderboard(room);
    room.pastRounds.push({
      start: room.currentRound.start,
      target: room.currentRound.target,
      rules: JSON.parse(JSON.stringify(room.rules)),
      result: room.currentRound.result
        .map((res) => ({
          ...res,
          path: room.currentState[res.username].path,
        }))
        .sort((a, b) => b.score - a.score),
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
    updateUpdated(room);
  };

  // start game
  socket.on('start', (_, ack) => {
    if (room.host !== username) {
      console.log(
        `[room=${room.roomId},lang=${room.lang}] [${username}] is not host and attempted to perform start, ignoring`
      );
      return;
    }
    console.log(
      `[room=${room.roomId},lang=${room.lang}] [${username}] starts round!`
    );

    if (room.currentRound.started) {
      console.log(
        `[room=${room.roomId},lang=${room.lang}] [${username}] attempted to perform start, but round is already started, ignoring`
      );
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
      stack: [room.currentRound.start],
      clicks: 0,
      backs: 0,
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
        console.log(
          `[room=${room.roomId},lang=${room.lang}] ticker: timeLeft=${room.currentRound.timeLeft}`
        );
        socket.to(room.roomId).emit('update', {
          currentRound: { timeLeft: room.currentRound.timeLeft },
        });
        socket.emit('update', {
          currentRound: { timeLeft: room.currentRound.timeLeft },
        });
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
    updateUpdated(room);
  });

  socket.on('click', async (data, ack) => {
    console.log(
      `[room=${room.roomId},lang=${room.lang}] [${username}] is clicking ${data.article}`
    );

    if (room.state !== 'playing' || room.currentState[username].finished) {
      ack({ success: false });
      return;
    }

    // resolve article, including redirects etc.
    const validated = await validateArticle(data.article, room.lang);
    if (!validated.found) {
      ack({ success: false });
      return;
    }
    const article = validated.title;

    if (room.rules.bannedArticles.includes(article)) {
      ack({
        success: false,
        message: `${article} is banned! You can't go there!`,
      });
      return;
    }

    if (
      typeof room.rules.allowDisambiguation === 'boolean' &&
      !room.rules.allowDisambiguation &&
      validated.type === 'disambiguation'
    ) {
      ack({
        success: false,
        message: `${article} is a disambiguation page! You can't go there!`,
      });
      return;
    }

    if (
      !room.rules.allowCategory &&
      (validated.namespace === 14 || validated.namespace === 15) // https://en.wikipedia.org/wiki/Wikipedia%3ANamespace
    ) {
      ack({
        success: false,
        message: `${article} is a category page! You can't go there!`,
      });
      return;
    }

    if (validated.namespace !== 0 && validated.namespace !== 14) {
      ack({
        success: false,
        message: `${article} is a special Wikipedia page! You can't go there!`,
      });
      return;
    }

    // Double articles checks
    // Since clicking improvement in client side, perhaps we don't need really this.
    // However, there's no harm in more precaution (other than the slight advantage to users)
    if (room.currentState[username].path.slice(-1)[0] !== article) {
      room.currentState[username].path.push(article);
      room.currentState[username].stack.push(article);
      room.currentState[username].clicks++;
    }

    // win condition checks
    if (article === room.currentRound.target) {
      room.currentState[username].finished = true;
      room.currentState[username].timeTaken = getElapsedTime(
        room.currentRound.startTimestamp
      );
      room.currentState[username].score = calculateScore(
        room.currentState[username],
        room.rules
      );
    }

    generateCurrentRoundResult(room);

    ack({
      success: true,
      data: room.currentState[username],
    });

    socket.to(room.roomId).emit('update', { currentRound: room.currentRound });
    socket.emit('update', { currentRound: room.currentRound });
    updateUpdated(room);

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

  socket.on('navigate', async (data, ack) => {
    console.log(
      `[room=${room.roomId},lang=${room.lang}] [${username}] is navigating to ${data.article}`
    );

    if (room.state !== 'playing' || room.currentState[username].finished) {
      ack({ success: false });
      return;
    }

    // resolve article, including redirects etc.
    const validated = await validateArticle(data.article, room.lang);
    if (!validated.found) {
      ack({ success: false });
      return;
    }
    const article = validated.title;

    // equals last article, it's a valid move
    if (article === room.currentState[username].path.slice(-1)[0]) {
      ack({ success: true });
      return;
    }

    // check if back is allowed
    const stack = room.currentState[username].stack;
    if (
      room.rules.allowBack &&
      stack.length >= 2 &&
      article === stack.slice(-2)[0]
    ) {
      room.currentState[username].backs++;
      room.currentState[username].path.push(article);
      room.currentState[username].stack.pop();
      room.currentState[username].clicks += room.currentState[username].backs;

      ack({
        success: true,
        data: room.currentState[username],
      });

      // don't forget to broadcast changes
      generateCurrentRoundResult(room);
      socket
        .to(room.roomId)
        .emit('update', { currentRound: room.currentRound });
      socket.emit('update', { currentRound: room.currentRound });
      updateUpdated(room);

      return;
    }

    ack({ success: false });
  });

  socket.on('disconnect', () => {
    console.log(
      `[room=${room.roomId},lang=${room.lang}] [${username}] disconnected!`
    );

    room.players = room.players.filter((p) => p !== username);
    activeConnections[room.roomId] = activeConnections[room.roomId].filter(
      (p) => p !== username
    );

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

    socket
      .to(room.roomId)
      .emit('update', { host: room.host, players: room.players });
    socket.to(room.roomId).emit('notification', {
      message: `${username} disconnected from the room`,
    });
    updateUpdated(room);
  });
};

const handler = () => {
  const router = express.Router();

  router.use('/_', (req, res, next) => {
    console.log(req.headers);
    if (req.headers.authorization !== process.env.SECRET) {
      res.status(403);
      res.send({ error: `You are not authorized to perform this command` });
    } else {
      next();
    }
  });
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
  router.post('/_/:roomId', (req, res) => {
    const body = req.body;
    const { roomId } = req.params;
    const room = getRoomById(roomId);
    if (!room) {
      res.status(404);
      res.json({ error: `Room ${roomId} is not found` });
    } else {
      util.mergeDeep(room, body);
      res.json({ data: room });
    }
  });
  router.delete('/_/:roomId', (req, res) => {
    const { roomId } = req.params;
    if (!existsRoomById(roomId)) {
      res.status(404);
      res.json({ error: `Room ${roomId} is not found` });
    } else {
      const index = rooms.findIndex((room) => room.roomId === roomId);
      if (index !== -1) {
        rooms.splice(index, 1);
      }
      res.json({ message: `room ${roomId} successfully deleted` });
    }
  });

  return router;
};

const gc = setInterval(() => {
  // garbage-collect rooms that's been idle for > 30 mins
  let toDelete = [];
  rooms.forEach((room) => {
    if (util.now() - room.updated > 30 * 60) {
      toDelete.push(room.roomId);
    }
  });
  if (toDelete.length) {
    console.log(
      `[garbage-collect] will delete the following rooms: ${JSON.stringify(
        toDelete
      )}`
    );
    for (const roomId of toDelete) {
      const index = rooms.findIndex((room) => room.roomId === roomId);
      if (index !== -1) {
        rooms.splice(index, 1);
      }
    }
  }
}, 60000);

const init = (io) => {
  // load data on startup and save on exit
  persistence.init().then(async (ok) => {
    if (ok) {
      console.log('loading data from persistence ...');
      const data = await persistence.load();
      rooms.push(...data);
      console.log('loading data done!');

      // rerun ticker for rooms in progress
      rooms.forEach((room) => {
        if (room.state === 'playing') {
          const onFinished = () => {
            if (room.state !== 'playing') return;
            console.log(
              `[room=${room.roomId},lang=${room.lang}] round finished!`
            );

            room.state = 'lobby';
            calculateLeaderboard(room);
            room.pastRounds.push({
              start: room.currentRound.start,
              target: room.currentRound.target,
              rules: JSON.parse(JSON.stringify(room.rules)),
              result: room.currentRound.result
                .map((res) => ({
                  ...res,
                  path: room.currentState[res.username].path,
                }))
                .sort((a, b) => b.score - a.score),
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
            io.sockets.to(room.roomId).emit('finished', finishedState);
          };

          const ticker = setInterval(() => {
            const elapsed = getElapsedTime(room.currentRound.startTimestamp);
            room.currentRound.timeLeft = room.rules.timeLimit - elapsed;
            if (room.currentRound.timeLeft > 0) {
              console.log(
                `[room=${room.roomId},lang=${room.lang}] ticker: timeLeft=${room.currentRound.timeLeft}`
              );
              io.sockets.to(room.roomId).emit('update', {
                currentRound: { timeLeft: room.currentRound.timeLeft },
              });
            } else {
              clearInterval(ticker);
              onFinished();
            }
          }, 1000);
        }
      });

      ['SIGTERM', 'SIGINT'].forEach((signal) => {
        process.on(signal, async function () {
          clearInterval(gc);
          console.log(`${signal} received, storing data ...`);
          try {
            await persistence.store(rooms);
            console.log('storing data done!');
          } finally {
            process.exit(0);
          }
        });
      });
    }
  });
};

module.exports = {
  init,
  socketHandler,
  handler: handler(),
};
