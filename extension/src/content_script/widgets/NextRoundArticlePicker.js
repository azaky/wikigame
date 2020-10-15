import React from 'react';
import {ArticlePicker} from './ArticlePicker';

export function NextRoundArticlePicker(props) {
  const {round, disabled, onStartArticleChange, onTargetArticleChange, onStartRound} = props;

  const onStartClick = () => {
    if (disabled) return;

    onStartRound();
  }

  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3 style={{fontSize: '0.9em'}}>
        <span>Next Round</span>
      </h3>
      <div class="body vector-menu-content">
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
        {
          !disabled
            ? <button
                id="wikigame-start"
                onClick={onStartClick}
                style={{cursor: 'pointer'}}
              >
                Start
              </button>
            : null
        }
      </div>
    </nav>
  );
}
