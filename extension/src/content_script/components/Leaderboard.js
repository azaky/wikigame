import React from 'react';
import { useData } from '../DataContext';

function LeaderboardItem(props) {
  const { player, index, username, host, isOnline, onTransferHost } = props;

  let displayName = null;
  if (username === player.username) {
    displayName = (
      <b title="It's you!">
        {player.username} ({player.score})
      </b>
    );
  } else {
    displayName = (
      <>
        {player.username} ({player.score})
      </>
    );
  }

  let displayHost = null;
  if (isOnline) {
    if (host === player.username) {
      displayHost = <span title="Host"> 👑</span>;
    } else if (username === host) {
      displayHost = (
        <a onClick={() => onTransferHost(player.username)}>(make host)</a>
      );
    }
  }

  return (
    <li
      style={!isOnline ? { color: '#c7c7c7' } : {}}
      title={!isOnline ? 'Disconnected' : ''}
    >
      {index + 1}. {displayName} {displayHost}
    </li>
  );
}

export function Leaderboard(props) {
  const { onTransferHost } = props;
  const { leaderboard, host, username, players, mode } = useData();

  if (mode === 'single') {
    return (
      <nav class="vector-menu vector-menu-portal portal">
        <h3 style={{ fontSize: '0.9em' }}>
          <span>Score: {leaderboard[0].score}</span>
        </h3>
      </nav>
    );
  }

  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3 style={{ fontSize: '0.9em' }}>
        <span>Leaderboard</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          {leaderboard.map((player, index) => (
            <LeaderboardItem
              player={player}
              index={index}
              host={host}
              username={username}
              isOnline={players.includes(player.username)}
              onTransferHost={onTransferHost}
            />
          ))}
        </ul>
      </div>
    </nav>
  );
}
