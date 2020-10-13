
import React, {useState, useEffect} from 'react';
import {getCurrentArticle, goto} from '../util';
import {getRandomPage} from '../wiki';

export function ArticlePicker(props) {
  const {onChange, disabled, placeholder} = props;

  const [value, setValue] = useState(props.value);
  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  const onChangeToCurrent = () => {
    if (disabled) return;

    onChange(getCurrentArticle());
  };

  const onChangeToRandom = () => {
    if (disabled) return;

    setValue('Loading...');
    getRandomPage()
      .then(title => {
        onChange(title);
      })
      .catch(err => {
        console.error('onChangeToRandom error:', err);
      });
  };

  const view = () => {
    // trust props.value than state.value
    if (!props.value) return;

    goto(props.value);
  };

  return (
    <div class="wikigame-article-picker">
      <input
        type="text"
        placeholder={placeholder || "Pick an article"}
        disabled={disabled}
        value={value}
        title={value}
        onChange={e => setValue(e.target.value)}
        onBlur={e => onChange(e.target.value)}
      />
      <div>
        <a style={{fontSize: '0.75em'}} onClick={onChangeToCurrent} disabled={disabled}>current</a>
        {' | '}
        <a style={{fontSize: '0.75em'}} onClick={onChangeToRandom} disabled={disabled}>random</a>
        {' | '}
        <a style={{fontSize: '0.75em'}} disabled={!!props.value} onClick={view}>view</a>
      </div>
    </div>
  );
}
