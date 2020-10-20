import React, { useState, useEffect } from 'react';
import { getCurrentArticle, getLang } from '../util';
import { getRandomPage, getAutocomplete } from '../wiki';
import AsyncSelect from 'react-select/async';
import { toast } from 'react-toastify';
import { useLang } from '../DataContext';

export function ArticlePicker(props) {
  const { onChange, disabled, placeholder } = props;
  const [loading, setLoading] = useState(false);
  const lang = useLang();

  useEffect(() => {
    setLoading(false);
  }, [props.value]);

  const loadOptions = (inputValue) => {
    return getAutocomplete(inputValue).then((titles) =>
      titles.map((title) => ({
        value: title,
        label: title,
      }))
    );
  };

  const onSelected = (selected, { action }) => {
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

    // check article language, just in case
    const currentArticleLang = window.location.hostname.split('.')[0];
    if (lang !== currentArticleLang) {
      toast.error(
        `Current article language (${currentArticleLang}) differs from game lang (${lang})!`
      );
      return;
    }

    setLoading(true);
    onChange(getCurrentArticle(), () => {
      setLoading(false);
    });
  };

  const onChangeToRandom = () => {
    if (disabled) return;

    setLoading(true);
    getRandomPage(lang)
      .then((title) => {
        onChange(title, () => {
          setLoading(false);
        });
      })
      .catch((err) => {
        toast.error(`Error getting random articles: ${err.message}`);
        setLoading(false);
      });
  };

  return (
    <div class="wikigame-article-picker">
      <div title={props.value}>
        <AsyncSelect
          cacheOptions
          loadOptions={loadOptions}
          onChange={onSelected}
          components={{
            DropdownIndicator: () => null,
            IndicatorSeparator: () => null,
          }}
          noOptionsMessage={() => null}
          isClearable={true}
          isDisabled={disabled}
          isLoading={loading}
          value={
            props.value
              ? {
                  label: props.value.replace(/_/g, ' '),
                  value: props.value,
                }
              : null
          }
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
      {!disabled ? (
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
      ) : null}
    </div>
  );
}
