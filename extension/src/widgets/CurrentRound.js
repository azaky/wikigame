import React, {useEffect, useState} from 'react';
import {ArticlePicker} from './ArticlePicker';
import {Rules} from './Rules';

export function CurrentRound(props) {
  const {round, rules, disabled, onStartArticleChange, onTargetArticleChange, onStartRound, onRulesChange} = props;

  return (
    <>
      {
        round.started
          ? <CurrentRoundStatus round={round} />
          : <CurrentRoundArticlePicker
              round={round}
              disabled={disabled}
              onStartArticleChange={onStartArticleChange}
              onTargetArticleChange={onTargetArticleChange}
              onStartRound={onStartRound}
            />
      }
      <Rules
        rules={rules}
        disabled={disabled}
        onRulesChange={onRulesChange}
      />
    </>
  );
}

function CurrentRoundArticlePicker(props) {
  const {round, disabled, onStartArticleChange, onTargetArticleChange, onStartRound} = props;

  const onStartClick = () => {
    if (disabled) return;

    onStartRound();
  }

  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
        <span>Next Round</span>
      </h3>
      <div class="body vector-menu-content">
        <div style={{paddingBottom: '10px'}}>
          <label>Start Article</label>
          <div style={{paddingBottom: '10px'}}>
            <ArticlePicker
              value={round.start}
              onChange={onStartArticleChange}
              disabled={disabled}
            />
          </div>
          <label>Target Article</label>
          <div style={{paddingBottom: '10px'}}>
            <ArticlePicker
              value={round.target}
              onChange={onTargetArticleChange}
              disabled={disabled}
            />
          </div>
        </div>
        {
          !disabled
            ? <button id="wikigame-start" onClick={onStartClick}>Start</button>
            : null
        }
      </div>
    </nav>
  );
}

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
                {player.finished ? <>(score = ${player.score})</> : null}
              </li>
            ))
          }
        </ul>
      </div>
    </nav>
  );
}

function CurrentRoundStatus(props) {
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
