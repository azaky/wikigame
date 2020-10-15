import React from 'react';

function ArticleOverview(props) {
  const {article, label, thumbnail} = props;

  return (
    <div style={{paddingBottom: '10px'}}>
      <label>{label}</label><br/>
      {
        thumbnail
          ? <div>
              <img
                src={thumbnail}
                width="120"
                style={{ marginTop: '5px', marginBottom: '5px' }}
              />
            </div>
          : null
      }
      <span style={{wordBreak: 'break-all'}}><b>{article}</b></span>
    </div>
  );
}

function Countdown(props) {
  const {timeLeft} = props;

  return (
    <button
      id="wikigame-countdown"
      style={timeLeft < 10 ? {backgroundColor: 'red'} : {}}
      disabled
    >
      {Math.floor(timeLeft / 60)}:{(`00${timeLeft % 60}`).slice(-2)}
    </button>
  );
}

function CurrentRoundStandings(props) {
  const standings = props.standings || [];
  return (
    <div>
      <ul>
        {
          standings.map(player => (
            <li>
              {player.username} ({player.clicks} click{player.clicks > 1 ? 's' : ''})
              {player.finished ? <>{' '}(score = {player.score})</> : null}
            </li>
          ))
        }
      </ul>
    </div>
  );
}

function CurrentPath(props) {
  const {path} = props;
  return (
    <div>
      <ul>
        {path.map((a) => <li>{a}</li>)}
      </ul>
    </div>
  );
}

export function CurrentRoundOverview(props) {
  const {round, currentState} = props;

  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3 style={{fontSize: '0.9em'}}>
      <span>Round standings</span>
      </h3>
      <div class="body vector-menu-content">
        <CurrentRoundStandings standings={round.result} />
      </div>
      <h3 style={{fontSize: '0.9em'}}>
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
      <h3>
        <span>Current Path ({currentState.path.length-1} {currentState.path.length > 2 ? 'clicks' : 'click'})</span>
      </h3>
      <div class="body vector-menu-content">
        <CurrentPath path={currentState.path} />
      </div>
    </nav>
  );
}
