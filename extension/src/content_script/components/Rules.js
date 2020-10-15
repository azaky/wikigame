import React, {useState, useEffect} from 'react';
import {toast} from 'react-toastify';
import {ArticlePicker} from './ArticlePicker';
import * as util from '../util';

function TimeLimit(props) {
  const {disabled, onChange} = props;

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
        onChange={e => {
          setValue(e.target.value);
          onChange(parseInt(e.target.value, 10));
        }}
      />
    </div>
  );
}

function ScoringMetrics(props) {
  const {disabled, onChange} = props;

  const [value, setValue] = useState(props.value);

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  const metrics = ['clicks', 'time', 'combined'];

  return (
    <div>
      <label>Scoring Metrics</label>
      <select
        style={{textTransform:'capitalize'}}
        value={value}
        disabled={disabled}
        onChange={e => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
      >
        {
          metrics.map(m => (
            <option value={m}>{m}</option>
          ))
        }
      </select>
    </div>
  );
}

function CheckBox(props) {
  const {label, disabled, onChange} = props;

  const [checked, setChecked] = useState(props.checked);

  useEffect(() => {
    setChecked(props.checked);
  }, [props.checked]);

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={e => {
            setChecked(e.target.checked);
            onChange(e.target.checked);
          }}
        />
        {label}
      </label>
    </div>
  );
}

function BannedArticles(props) {
  const {bannedArticles, disabled, onChange, roundStarted} = props;

  const onAdd = (value, callback) => {
    const duplicated = bannedArticles.includes(value);
    if (disabled || roundStarted || (!value || duplicated)) {
      if (duplicated) {
        toast.error(`Article ${value} is already banned!`);
      }
      if (callback) callback();
      return;
    }

    onChange(bannedArticles.concat(value), callback);
  };

  const onDelete = value => {
    if (disabled || roundStarted) return;
    if (!value || !bannedArticles.includes(value)) return;

    onChange(bannedArticles.filter(a => a != value));
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
          {
            bannedArticles.map(article => (
              <li>
                {article}
                {
                  roundStarted ? null : <>
                    {' '}
                    <a onClick={() => util.goto(article)}>(view)</a>
                  </>
                }
                {
                  disabled || roundStarted ? null : <>
                    {' '}
                    <a onClick={() => onDelete(article)}>(delete)</a>
                  </>
                }
              </li>
            ))
          }
        </ul>
        {
          disabled ? null : (
            <div>
              {
                bannedArticles.length > 0 ? (
                  <div style={{paddingBottom: '10px'}}>
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
                ) : null
              }
              <ArticlePicker
                onChange={onAdd}
                disabled={disabled}
                placeholder="Ban an article..."
                hideView={true}
              />
            </div>
          )
        }
      </div>
    </>
  );
}

export function Rules(props) {
  const {rules, disabled, roundStarted, onRulesChange} = props;

  const onTimeLimitChange = timeLimit => {
    if (disabled || roundStarted) return;
    onRulesChange({ timeLimit: parseInt(timeLimit) });
  };

  const onScoringMetricsChange = metrics => {
    if (disabled || roundStarted) return;
    onRulesChange({ metrics: metrics });
  };

  const onAllowCtrlfChange = allow => {
    if (disabled || roundStarted) return;
    onRulesChange({ allowCtrlf: !!allow });
  };

  const onAllowDisambiguationChange = allow => {
    if (disabled || roundStarted) return;
    onRulesChange({ allowDisambiguation: !!allow });
  };

  const onBannedArticlesChange = (bannedArticles, callback) => {
    if (disabled || roundStarted) {
      if (callback) return callback();
      return;
    }
    onRulesChange({ bannedArticles: bannedArticles }, callback);
  };

  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3 style={{fontSize: '0.9em'}}>
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
          label="Allow disambiguation page"
          checked={rules.allowDisambiguation}
          onChange={onAllowDisambiguationChange}
          disabled={disabled}
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