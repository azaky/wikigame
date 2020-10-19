import React from 'react';
import * as util from '../util';

import { toast } from 'react-toastify';

export function LastRoundOverview(props) {
  const {round} = props;

  const metrics = (round.rules && round.rules.metrics) || 'click';

  const onShowDetails = player => {
    const toastId = 'playerLastRoundDetails';
    if (toast.isActive(toastId)) {
      toast.dismiss(toastId);
    }
    toast(() => (
      <div>
        <div><h3>{player.username}'s last round</h3></div>
        <div>
          {player.clicks} {player.clicks > 1 ? ' clicks' : ' click'} {player.finished ? '' : ' (not finished)'}
        </div>
        {player.finished ? (
          <div>
            Score = {player.score}, Time Taken = {player.timeTaken} {player.timeTaken > 1 ? ' seconds' : ' second'}
          </div>
        ) : null}
        <div>
          {player.path.map(p => (
            <div>
              → <a href={util.getLink(p)}>{p.replace(/_/g, ' ')}</a>
            </div>
          ))}
        </div>
      </div>
    ), {
      toastId: toastId,
      autoClose: false,
    });
  };

  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3 style={{fontSize: '0.9em'}}>
        <span>Last Round</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          <li>
            <b>
              <a href={util.getLink(round.start)}>{round.start.replace(/_/g, ' ')}</a>
              {' to '}
              <a href={util.getLink(round.target)}>{round.target.replace(/_/g, ' ')}</a>
            </b>
          </li>
        </ul>
      </div>
      <div class="body vector-menu-content">
        <ul>
          <li>
            <a
              target="_blank"
              href={`https://www.sixdegreesofwikipedia.com/?source=${encodeURIComponent(round.start)}&target=${encodeURIComponent(round.target)}`}
              title="See solution on Six Degrees of Wikipedia"
            >
              <b>(See Solution)</b>
            </a>
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
                  {!player.finished ? '(not finished) ' : ''}
                  <a onClick={() => onShowDetails(player)}>
                    (
                      {
                        metrics === 'click' || !player.finished
                          ? (`${player.clicks} ${player.clicks > 1 ? 'clicks' : 'click'}`)
                          : metrics === 'time'
                            ? (`${player.timeTaken} ${player.timeTaken > 1 ? 'seconds' : 'second'}`)
                            : (`${player.score} ${player.score > 1 ? 'points' : 'point'}`)
                      }
                    )
                  </a>
                </li>
              );
            })
          }
        </ul>
      </div>
    </nav>
  );
}
