import React from 'react';
import { toast } from 'react-toastify';
import { useUsername } from '../DataContext';
import { getLink } from '../util';

function ArticleOverview(props) {
  const { article, label, thumbnail } = props;

  return (
    <div style={{ paddingBottom: '10px' }}>
      <label>{label}</label>
      <br />
      {thumbnail ? (
        <div>
          <img
            src={thumbnail}
            width="120"
            style={{ marginTop: '5px', marginBottom: '5px' }}
          />
        </div>
      ) : null}
      <span style={{ wordBreak: 'break-all' }}>
        <b>{article.replace(/_/g, ' ')}</b>
      </span>
    </div>
  );
}

function Countdown(props) {
  const { timeLeft } = props;

  return (
    <button
      id="wikigame-countdown"
      style={{
        boxSizing: 'border-box',
        color: 'white',
        backgroundColor: timeLeft < 10 ? 'red' : 'black',
        height: '32px',
        fontSize: '1em',
        width: '100%',
      }}
      disabled
    >
      {Math.floor(timeLeft / 60)}:{`00${timeLeft % 60}`.slice(-2)}
    </button>
  );
}

function CurrentRoundStandings(props) {
  const { standings, finished } = props;
  const username = useUsername();

  const showPlayerPath = (username) => {
    chrome.runtime.sendMessage(
      { type: 'show_path', data: { username } },
      (response) => {
        if (!response || !response.success) return;
        const { data } = response;

        toast(
          <div>
            <div>
              <h3>
                {username}'s path {!data.finished ? ' (so far)' : ''}
              </h3>
            </div>
            <div>
              {data.clicks} {data.clicks > 1 ? ' clicks' : ' click'}{' '}
            </div>
            <div>
              {data.path.map((p) => (
                <div>
                  → <a href={getLink(p)}>{p.replace(/_/g, ' ')}</a>
                </div>
              ))}
            </div>
          </div>,
          {
            toastId: 'playerPathInGame',
            autoClose: false,
          }
        );
      }
    );
  };

  return (
    <div>
      <ul>
        {(standings || []).map((player) => (
          <li>
            {player.username}{' '}
            {finished && player.username !== username ? (
              <a onClick={() => showPlayerPath(player.username)}>
                ({player.clicks} {player.clicks > 1 ? 'clicks' : 'click'})
              </a>
            ) : (
              <>
                ({player.clicks} {player.clicks > 1 ? 'clicks' : 'click'})
              </>
            )}
            {player.finished ? <> (score = {player.score})</> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CurrentPath(props) {
  const { path } = props;
  return (
    <div>
      <ul>
        {path.map((a) => (
          <li>{a}</li>
        ))}
      </ul>
    </div>
  );
}

export function CurrentRoundOverview(props) {
  const { round, currentState } = props;
  const { finished } = currentState;

  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3 style={{ fontSize: '0.9em' }}>
        <span>Round standings</span>
      </h3>
      <div class="body vector-menu-content">
        <CurrentRoundStandings standings={round.result} finished={finished} />
      </div>
      <h3 style={{ fontSize: '0.9em' }}>
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
        <span>
          Current Path ({currentState.path.length - 1}{' '}
          {currentState.path.length > 2 ? 'clicks' : 'click'})
        </span>
      </h3>
      <div class="body vector-menu-content">
        <CurrentPath path={currentState.path} />
      </div>
    </nav>
  );
}
