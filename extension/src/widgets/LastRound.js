import React from 'react';
import * as util from '../util';

export function LastRound(props) {
  const {round} = props;

  const onShowDetails = player => {
    const details = [
      `Player: ${player.username} (${player.clicks} ${player.clicks > 1 ? 'clicks' : 'click'}${player.finished ? `, ${player.timeTaken} seconds, score = ${player.score}` : ' (not finished)'})`,
      `Path:`,
      ...player.path.map((p, i) => `-> ${p}${i ? '' : ' (start)'}`),
    ];
    alert(details.join('\n'));
  };

  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
        <span>Last Round</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          <li>
            <b>
              <a href={util.getLink(round.start)}>{round.start}</a>
              {' to '}
              <a href={util.getLink(round.target)}>{round.target}</a>
            </b>
          </li>
        </ul>
      </div>
      <div class="body vector-menu-content">
        <ul>
          <li><b>Results</b></li>
          {
            round.result.map(player => {
              return (
                <li>
                  {player.username}
                  {' '}
                  <a onClick={() => onShowDetails(player)}>
                    ({player.clicks} {player.clicks > 1 ? 'clicks' : 'click'})
                  </a>
                </li>
              );
            })
          }
        </ul>
      </div>
      <div class="body vector-menu-content">
        <ul>
          <li><b>Solution</b></li>
          <li>
            <a target="_blank" href={`https://www.sixdegreesofwikipedia.com/?source=${encodeURIComponent(round.start)}&target=${encodeURIComponent(round.target)}`}>
              Six Degree of Wikipedia
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
