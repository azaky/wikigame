import React from 'react';

function LeaderboardItem(props) {
  const {player, index, username, host, onTransferHost} = props;

  let displayName = null;
  if (username === player.username) {
    displayName = <b>{player.username} ({player.score})</b>;
  } else {
    displayName = <>{player.username} ({player.score})</>;
  }

  let displayHost = null;
  if (host === player.username) {
    displayHost = <span title="host"> 👑</span>;
  } else if (username === host) {
    displayHost = <a onClick={() => onTransferHost(player.username)}>(make host)</a>;
  }

  return (
    <li>
      {index+1}. {displayName} {displayHost}
    </li>
  );
}

export function Leaderboard(props) {
  const {leaderboard, host, username, onTransferHost} = props;

  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3 style={{fontSize: '0.9em'}}>
        <span>Leaderboard</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          {
            leaderboard.map((player, index) => (
              <LeaderboardItem
                player={player}
                index={index}
                host={host}
                username={username}
                onTransferHost={onTransferHost}
              />
            ))
          }
        </ul>
      </div>
    </nav>
  );
}