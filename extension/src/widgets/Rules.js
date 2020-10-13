import React, {useState, useEffect} from 'react';
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
      <label>Time Limit</label>
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
  const {bannedArticles, disabled, onChange} = props;

  const [pickerValue, setPickerValue] = useState('');

  const pickerOnChange = title => {
    if (disabled) return;

    setPickerValue(title);
  };

  const onAdd = value => {
    if (disabled) return;
    if (!value || bannedArticles.includes(value)) return;

    onChange(bannedArticles.concat(value));
  };

  const onDelete = value => {
    if (disabled) return;
    if (!value || !bannedArticles.includes(value)) return;

    onChange(bannedArticles.filter(a => a != value));
  };

  const onCurrent = () => onAdd(util.getCurrentArticle());

  const onClear = () => {
    if (disabled) return;

    onChange([]);
  };

  const onAddPicker = () => {
    onAdd(pickerValue);
    setPickerValue('');
  }

  return (
    <>
      <h3>
        <span>Banned Articles</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          {
            bannedArticles.map(a => (
              <li>
                {a}
                {' '}
                <a onClick={() => util.goto(a)}>(view)</a>
                {
                  disabled ? '' : <>
                    {' '}
                    <a onClick={() => onDelete(a)}>(delete)</a>
                  </>
                }
              </li>
            ))
          }
        </ul>
        {
          disabled ? null : (
            <div>
              <ArticlePicker
                onChange={pickerOnChange}
                disabled={disabled}
                value={pickerValue}
                placeholder="Add Banned Article"
              />
              <span>
                <button id="wikigame-banned-add" onClick={onAddPicker}>Add</button>
                {' '}
                <button id="wikigame-banned-current" onClick={onCurrent}>Current</button>
                {' '}
                <button id="wikigame-banned-clear" onClick={onClear}>Clear</button>
              </span>
            </div>
          )
        }
      </div>
    </>
  );
}

export function Rules(props) {
  const {rules, disabled, onRulesChange} = props;

  const onTimeLimitChange = timeLimit => {
    if (disabled) return;
    onRulesChange({ timeLimit: parseInt(timeLimit) });
  };

  const onScoringMetricsChange = metrics => {
    if (disabled) return;
    onRulesChange({ metrics: metrics });
  };

  const onAllowCtrlfChange = allow => {
    if (disabled) return;
    onRulesChange({ allowCtrlf: !!allow });
  };

  const onAllowDisambiguationChange = allow => {
    if (disabled) return;
    onRulesChange({ allowDisambiguation: !!allow });
  };

  const onBannedArticlesChange = bannedArticles => {
    if (disabled) return;
    onRulesChange({ bannedArticles: bannedArticles });
  };

  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
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
        <label>Additional Rules</label>
        <br/>
        <CheckBox
          label="Allow Ctrl+F"
          checked={rules.allowCtrlf}
          onChange={onAllowCtrlfChange}
          disabled={disabled}
        />
        <br/>
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
      />
    </nav>
  );
}
