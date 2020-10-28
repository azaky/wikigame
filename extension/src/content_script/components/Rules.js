import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ArticlePicker } from './ArticlePicker';
import { CheckBox } from './CheckBox';
import * as util from '../util';

function TimeLimit(props) {
  const { disabled, onChange } = props;

  const [value, setValue] = useState(props.value);

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  return (
    <div>
      <label>Time Limit</label>
      <input
        type="number"
        min="1"
        increment="1"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(parseInt(e.target.value, 10));
        }}
      />
    </div>
  );
}

function ScoringMetrics(props) {
  const { disabled, onChange } = props;

  const [value, setValue] = useState(props.value);

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  const metrics = ['time', 'clicks', 'combined'];

  const showHelp = () => {
    toast.dismiss('help');
    toast(
      <div>
        <h3>Scoring Help</h3>
        Your score will be 0 if you don't reach the target.
        <br />
        Otherwise, your score will be between 10 and 100 and will be calculated
        using the following formula based on the metrics you choose:
        <br />
        <br />
        <b>Time:</b> <code>score = 10 + 90 &times; timeLeft / timeLimit</code>
        <br />
        It means that your score will be 100 when you finish in an instant, and
        linearly decrease to 10 as you take more time.
        <br />
        <br />
        <b>Click:</b> <code>score = 10 &times; (11 - min(10, clicks))</code>
        <br />
        It means that your score will be 100 for 1 click, 90 for 2 clicks, etc.
        until only 10 points for 10 or more clicks.
        <br />
        <br />
        <b>Combined:</b> <code>score = (score time + score click) / 2</code>
        <br />
        You need to balance between number of clicks and time when using this
        metrics.
      </div>,
      {
        closeOnClick: false,
        autoClose: false,
        toastId: 'help',
      }
    );
  };

  return (
    <div>
      <label>
        Scoring Metrics&nbsp;
        <a title="Show info about scoring" onClick={showHelp}>
          🛈
        </a>
      </label>

      <select
        style={{ textTransform: 'capitalize' }}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
      >
        {metrics.map((m) => (
          <option value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}

function BannedArticles(props) {
  const { bannedArticles, disabled, onChange, roundStarted } = props;

  const onAdd = (value, callback) => {
    const duplicated = bannedArticles.includes(value);
    if (disabled || roundStarted || !value || duplicated) {
      if (duplicated) {
        toast.error(`Article ${value} is already banned!`);
      }
      if (callback) callback();
      return;
    }

    onChange(bannedArticles.concat(value), callback);
  };

  const onDelete = (value) => {
    if (disabled || roundStarted) return;
    if (!value || !bannedArticles.includes(value)) return;

    onChange(bannedArticles.filter((a) => a != value));
  };

  const onClear = () => {
    if (disabled || roundStarted) return;

    onChange([]);
  };

  return (
    <>
      <h3>
        <span>Banned Articles</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          {bannedArticles.map((article) => (
            <li>
              {article.replace(/_/g, ' ')}
              {roundStarted ? null : (
                <>
                  {' '}
                  <a onClick={() => util.goto(article)}>(view)</a>
                </>
              )}
              {disabled || roundStarted ? null : (
                <>
                  {' '}
                  <a onClick={() => onDelete(article)}>(delete)</a>
                </>
              )}
            </li>
          ))}
        </ul>
        {disabled ? null : (
          <div>
            {bannedArticles.length > 0 ? (
              <div style={{ paddingBottom: '10px' }}>
                <button
                  style={{
                    backgroundColor: '#b32424',
                    color: 'white',
                    fontSize: '0.6em',
                  }}
                  onClick={onClear}
                >
                  Clear
                </button>
              </div>
            ) : null}
            <ArticlePicker
              onChange={onAdd}
              disabled={disabled}
              placeholder="Ban an article..."
              hideView={true}
            />
          </div>
        )}
      </div>
    </>
  );
}

export function Rules(props) {
  const { rules, disabled, roundStarted, onRulesChange } = props;

  const onTimeLimitChange = (timeLimit) => {
    if (disabled || roundStarted) return;
    onRulesChange({ timeLimit: parseInt(timeLimit) });
  };

  const onScoringMetricsChange = (metrics) => {
    if (disabled || roundStarted) return;
    onRulesChange({ metrics: metrics });
  };

  const onAllowCtrlfChange = (allow) => {
    if (disabled || roundStarted) return;
    onRulesChange({ allowCtrlf: !!allow });
  };

  const onAllowDisambiguationChange = (allow) => {
    if (disabled || roundStarted) return;
    onRulesChange({ allowDisambiguation: !!allow });
  };

  const onAllowBackChange = (allow) => {
    if (disabled || roundStarted) return;
    onRulesChange({ allowBack: !!allow });
  };

  const onAllowCategoryChange = (allow) => {
    if (disabled || roundStarted) return;
    onRulesChange({ allowCategory: !!allow });
  };

  const onAllowNavChange = (allow) => {
    if (disabled || roundStarted) return;
    onRulesChange({ allowNav: !!allow });
  };

  const onShowArticlePreviewChange = (show) => {
    if (disabled || roundStarted) return;
    onRulesChange({ showArticlePreview: !!show });
  };

  const onBannedArticlesChange = (bannedArticles, callback) => {
    if (disabled || roundStarted) {
      if (callback) return callback();
      return;
    }
    onRulesChange({ bannedArticles: bannedArticles }, callback);
  };

  const onShowBackInfo = () => {
    toast.dismiss('help');
    toast(
      <div>
        <h3>Rules on Back</h3>
        If you allow back, then you are allowed to go to the last article.
        However, each time you go back,{' '}
        <strong>the click cost increases</strong>.
        <br />
        <br />
        For example, first time you go back, it adds 1 click (just like when you
        click on links normally). But on the second time, it adds you 2 clicks,
        on the third time it adds you 3 clicks, and so on.
      </div>,
      {
        closeOnClick: false,
        autoClose: false,
        toastId: 'help',
      }
    );
  };

  const onShowNavInfo = () => {
    toast.dismiss('help');
    toast(
      <div>
        <h3>Navigation Links</h3>
        Navigational links are the links contained in the tables on the bottom
        of an article (if there's any). Usually they allow you to quickly
        navigate between topics within the same area.
      </div>,
      {
        closeOnClick: false,
        autoClose: false,
        toastId: 'help',
      }
    );
  };

  const onShowPreviewInfo = () => {
    toast.dismiss('help');
    toast(
      <div>
        <h3>Article Preview</h3>
        Article Preview is the popup that shows when you hover a link. It
        usually contains the summary of the article the link points to. When you
        disable it, no popups will be shown when you hover any links.
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
        <span>Rules</span>
      </h3>
      <div class="body vector-menu-content">
        <TimeLimit
          value={rules.timeLimit}
          onChange={onTimeLimitChange}
          disabled={disabled}
        />
        <ScoringMetrics
          value={rules.metrics}
          onChange={onScoringMetricsChange}
          disabled={disabled}
        />
      </div>
      <h3>
        <span>Additional Rules</span>
      </h3>
      <div class="body vector-menu-content">
        <CheckBox
          label="Allow Ctrl+F"
          checked={rules.allowCtrlf}
          onChange={onAllowCtrlfChange}
          disabled={disabled}
        />
        <CheckBox
          label="Allow back"
          checked={rules.allowBack}
          onChange={onAllowBackChange}
          disabled={disabled}
          onShowInfo={onShowBackInfo}
        />
        <CheckBox
          label="Allow disambiguation page"
          checked={rules.allowDisambiguation}
          onChange={onAllowDisambiguationChange}
          disabled={disabled}
        />
        <CheckBox
          label="Allow category page"
          checked={rules.allowCategory}
          onChange={onAllowCategoryChange}
          disabled={disabled}
        />
        <CheckBox
          label="Allow navigation links"
          checked={rules.allowNav}
          onChange={onAllowNavChange}
          disabled={disabled}
          onShowInfo={onShowNavInfo}
        />
        <CheckBox
          label="Show article preview"
          checked={rules.showArticlePreview}
          onChange={onShowArticlePreviewChange}
          disabled={disabled}
          onShowInfo={onShowPreviewInfo}
        />
      </div>
      <BannedArticles
        bannedArticles={rules.bannedArticles}
        onChange={onBannedArticlesChange}
        disabled={disabled}
        roundStarted={roundStarted}
      />
    </nav>
  );
}
