import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useLang } from '../DataContext';
import * as util from '../util';
import { ArticlePicker } from './ArticlePicker';
import { CheckBox } from './CheckBox';

export function NextRoundArticlePicker(props) {
  const {
    round,
    disabled,
    onStartArticleChange,
    onTargetArticleChange,
    onSwapArticles,
    onStartRound,
  } = props;
  const lang = useLang();

  const [useFilteredRandom, setUseFilteredRandom] = useState(lang === 'en');

  const getRandom = () =>
    window
      .fetch(
        `${process.env.WIKIGAME_SERVER_URL}/wiki/random?${new URLSearchParams({
          lang,
        })}`
      )
      .then((res) => res.json())
      .then((data) => data.data && data.data.title);

  const onStartClick = () => {
    if (disabled) return;

    onStartRound();
  };

  const onShowRandomInfo = () => {
    toast.dismiss('help');
    toast(
      <div>
        <h3>Most Linked Articles</h3>
        When this option is checked, we will only randomize target articles from
        top 10k articles based on the number of other articles that link to
        them.
        <br />
        <br />
        To give you an idea, all these articles have at least 2000 other
        articles that have links to them.
      </div>,
      {
        closeOnClick: false,
        autoClose: false,
        toastId: 'help',
      }
    );
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
        {!disabled && (round.start || round.target) ? (
          <div style={{ marginBottom: '10px' }}>
            <a onClick={() => onSwapArticles()} style={{ fontSize: '0.75em' }}>
              (swap start/target articles)
            </a>
            <br />
          </div>
        ) : null}
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
            randomFn={useFilteredRandom ? getRandom : null}
          />
          {lang === 'en' && !disabled ? (
            <CheckBox
              label="random from most linked articles only"
              checked={useFilteredRandom}
              onChange={setUseFilteredRandom}
              onShowInfo={onShowRandomInfo}
              infoTitle="Show info about most linked articles"
            />
          ) : null}
        </div>
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
