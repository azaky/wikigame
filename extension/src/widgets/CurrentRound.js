import React, {useEffect, useState} from 'react';

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
      {/* <Rules
        rules={rules}
        disabled={disabled}
        onRulesChange={onRulesChange}
      /> */}
    </>
  );
}

// TODO: export to own widget
function ArticlePicker(props) {
  const {value, onChange, disabled} = props;
  return (
    <input
      type="text"
      placeholder="Pick an article"
      id="wikigame-article-start"
      disabled={disabled}
      value={value}
      onChange={onChange}
    />
      // {/* ${disabled ? '' : `
      // <a class="a" href="#" id="wikigame-article-start-current">current</a>
      // |
      // <a class="a" href="#" id="wikigame-article-start-random">random</a>
      // `} */}

  );
}

function CurrentRoundArticlePicker(props) {
  const {round, disabled, onStartArticleChange, onTargetArticleChange, onStart} = props;
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
            ? <button id="wikigame-start" onclick={onStartRound}>Start</button>
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
      <span style={{wordBreak: 'break-all'}}><b>{article}</b></span>
    </div>
  );
}

function Countdown(props) {
  return (
    <button id="wikigame-countdown" disabled class={round.timeLeft < 10 ? 'red' : ''}>
      {Math.floor(round.timeLeft / 60)}:{(`00${round.timeLeft % 60}`).slice(-2)}
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
        </div>
      </nav>
      <RoundStandings standings={round.result} />
    </>
  );
}