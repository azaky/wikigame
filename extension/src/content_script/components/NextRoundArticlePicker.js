import React from 'react';
import * as util from '../util';
import { ArticlePicker } from './ArticlePicker';

export function NextRoundArticlePicker(props) {
  const {
    round,
    disabled,
    onStartArticleChange,
    onTargetArticleChange,
    onSwapArticles,
    onStartRound,
  } = props;

  const onStartClick = () => {
    if (disabled) return;

    onStartRound();
  };

  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3 style={{ fontSize: '0.9em' }}>
        <span>Next Round</span>
      </h3>
      <div class="body vector-menu-content" style={{ paddingTop: '10px' }}>
        <label>Start Article</label>
        {round.start ? (
          <a
            style={{ fontSize: '0.75em' }}
            onClick={() => util.goto(round.start)}
          >
            &nbsp;(view)
          </a>
        ) : null}
        <div style={{ paddingBottom: '10px' }}>
          <ArticlePicker
            value={round.start}
            onChange={onStartArticleChange}
            disabled={disabled}
          />
        </div>
        <label>Target Article</label>
        {round.target ? (
          <a
            style={{ fontSize: '0.75em' }}
            onClick={() => util.goto(round.target)}
          >
            &nbsp;(view)
          </a>
        ) : null}
        <div>
          <ArticlePicker
            value={round.target}
            onChange={onTargetArticleChange}
            disabled={disabled}
          />
        </div>
        {round.start || round.target ? (
          <div style={{ marginTop: '5px' }}>
            <a onClick={() => onSwapArticles()} style={{ fontSize: '0.75em' }}>
              (swap start/target articles)
            </a>
            <br />
          </div>
        ) : null}
        {!disabled ? (
          <button
            id="wikigame-start"
            onClick={onStartClick}
            style={{
              boxSizing: 'border-box',
              color: 'white',
              backgroundColor: 'black',
              cursor: 'pointer',
              height: '32px',
              fontSize: '1em',
              width: '100%',
              marginTop: '10px',
            }}
          >
            Start
          </button>
        ) : null}
      </div>
    </nav>
  );
}
