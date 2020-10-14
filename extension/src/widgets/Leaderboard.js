import React, {useEffect, useState} from 'react';

export function Leaderboard(props) {
  const {leaderboard, host, username} = props;
  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3 style={{fontSize: '0.9em'}}>
        <span>Leaderboard</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          {
            leaderboard.map((player, index) => (
              <li>
                {index+1}.
                {
                  username === player.username
                    ? <b>{player.username} ({player.score})</b>
                    : <>{player.username} ({player.score})</>
                }
                {
                  host === player.username
                    ? <span title="host"> 👑</span>
                    : null
                }
              </li>
            ))
          }
        </ul>
      </div>
    </nav>
  );
}