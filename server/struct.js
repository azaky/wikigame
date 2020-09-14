let = {
  roomId: '123',
  url: url,
  host: 'azaky',
  state: 'playing|lobby',
  localState: '', // stored by background.js or content_script.js
  players: [ // only active players
    'azaky',
    'az'
  ],
  currentRound: { // public info about current round
    start: 'start_article',
    target: 'target_article',
    started: true,
    startTimestamp: timestamp,
    timeLeft: 120,
    result: [
      {
        username: azaky,
        finished: false,
        clicks: 5,
        timeTaken: 0,
        score: 0
      },
      {
        username: az,
        finished: true,
        clicks: 3,
        timeTaken: 10,
        score: 20
      }
    ]
  },
  currentState: { // private info about each player's progresses
    azaky: {
      path: ['article1', 'article2', 'article3'],
      clicks: 2,
      finished: false,
      timeTaken: 0,
      score: 0
    }
  },
  rules: {
    timeLimit: 120,
    metrics: 'clicks',
    allowCtrlf: true,
    allowDisambiguation: true,
    bannedArticles: []
  },
  leaderboard: [
    {
      username: 'azaky',
      score: 200
    },
    ...[]
  ],
  pastRounds: [
    {
      start: 'start_article',
      target: 'target_article',
      result: [
        {
          username: 'azaky',
          path: ['article1', 'article2', ...],
          clicks: 2,
          finished: true,
          score: 30
        },
        ...[]
      ]
    }
  ]
}

let events = {
  'update': {key: object}, // both ways
  'start': {currentState},
  'click': {
    valid,
    currentState,
  },
  'finished': {
    currentRound,
    leaderboard,
    lastRound,
  },


}