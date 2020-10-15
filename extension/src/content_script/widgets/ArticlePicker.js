
import React, {useState, useEffect, useRef} from 'react';
import {getCurrentArticle} from '../util';
import {getRandomPage, getAutocomplete} from '../wiki';
import AsyncSelect from 'react-select/async';

export function ArticlePicker(props) {
  const {onChange, disabled, placeholder} = props;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [props.value]);

  const loadOptions = inputValue => {
    return getAutocomplete(inputValue)
      .then(titles => titles.map(title => ({
        value: title,
        label: title,
      })));
  };

  const onSelected = (selected, {action}) => {
    if (selected) {
      setLoading(true);
      onChange(selected.value, () => {
        setLoading(false);
      });
    } else {
      onChange('', () => {
        setLoading(false);
      });
    }
  };

  const onChangeToCurrent = () => {
    if (disabled) return;

    onChange(getCurrentArticle());
  };

  const onChangeToRandom = () => {
    if (disabled) return;

    setLoading(true);
    getRandomPage()
      .then(title => {
        onChange(title, () => {
          setLoading(false);
        });
      })
      .catch(err => {
        console.error('onChangeToRandom error:', err);
        setLoading(false);
      });
  };

  return (
    <div class='wikigame-article-picker'>
      <div title={props.value}>
        <AsyncSelect
          cacheOptions
          loadOptions={loadOptions}
          onChange={onSelected}
          components={{
            DropdownIndicator:() => null,
            IndicatorSeparator:() => null,
          }}
          noOptionsMessage={() => null}
          isClearable={true}
          isDisabled={disabled}
          isLoading={loading}
          value={props.value ? {
            label: props.value,
            value: props.value,
          } : null}
          placeholder={placeholder || (disabled ? '' : 'Search article...')}
          styles={{
            container: (provided) => ({
              ...provided,
              minHeight: '1px',
              fontSize: '0.8em',
            }),
            control: (provided) => ({
              ...provided,
              minHeight: '1px',
              borderRadius: 0,
              cursor: 'text',
              padding: 0,
            }),
            input: (provided) => ({
              ...provided,
              minHeight: '1px',
            }),
            clearIndicator: (provided) => ({
              ...provided,
              paddingTop: 0,
              paddingBottom: 0,
              minHeight: '1px',
              cursor: 'pointer',
            }),
            valueContainer: (provided) => ({
              ...provided,
              minHeight: '1px',
              height: '32px',
              paddingTop: '0',
              paddingBottom: '0',
            }),
            singleValue: (provided) => ({
              ...provided,
              minHeight: '1px',
              paddingBottom: '0px',
            }),
          }}
        />
      </div>
      {
        !disabled ? (
          <div>
            <button
              style={{
                width: '50%',
                color: 'white',
                backgroundColor: '#3c3c3c',
                fontSize: '0.6em',
                cursor: 'pointer',
                borderWidth: '1px',
              }}
              onClick={onChangeToCurrent}
            >
              current
            </button>
            <button
              style={{
                width: '50%',
                color: '#0645b4',
                backgroundColor: '#afd9f7',
                fontSize: '0.6em',
                cursor: 'pointer',
                borderWidth: '1px',
              }}
              onClick={onChangeToRandom}
            >
              random
            </button>
          </div>
        ) : null
      }
    </div>
  );
}
