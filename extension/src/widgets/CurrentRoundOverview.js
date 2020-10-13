import React from 'react';

function ArticleOverview(props) {
  const {article, label, thumbnail} = props;

  return (
    <div style={{paddingBottom: '10px'}}>
      <label>{label}</label><br/>
      {
        thumbnail
          ? <img
              src={thumbnail}
              width="120"
              style={{ marginTop: '5px', marginBottom: '5px' }}
            />
          : null
      }
      <br/>
      <span style={{wordBreak: 'break-all'}}><b>{article}</b></span>
    </div>
  );
}

function Countdown(props) {
  const {timeLeft} = props;

  return (
    <button
      id="wikigame-countdown"
      class={timeLeft < 10 ? 'red' : ''}
      disabled
    >
      {Math.floor(timeLeft / 60)}:{(`00${timeLeft % 60}`).slice(-2)}
    </button>
  );
}

function RoundStandings(props) {
  const standings = props.standings || [];
  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
        <span>Round standings</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          {
            standings.map(player => (
              <li>
                {player.username} ({player.clicks} click{player.clicks > 1 ? 's' : ''})
                {player.finished ? <>(score = {player.score})</> : null}
              </li>
            ))
          }
        </ul>
      </div>
    </nav>
  );
}

export function CurrentRoundOverview(props) {
  const {round} = props;

  return (
    <>
      <nav class="vector-menu vector-menu-portal portal">
        <h3>
          <span>Current Round</span>
        </h3>
        <div class="body vector-menu-content">
          <ArticleOverview
            label="Start Article"
            article={round.start}
            thumbnail={round.startThumbnail}
          />
          <ArticleOverview
            label="Target Article"
            article={round.target}
            thumbnail={round.targetThumbnail}
          />
          <Countdown timeLeft={round.timeLeft} />
        </div>
      </nav>
      <RoundStandings standings={round.result} />
    </>
  );
}
