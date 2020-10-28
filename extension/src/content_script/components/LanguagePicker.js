import React from 'react';
import Select from 'react-select';

import languages from '../../lang.json';

export function LanguagePicker(props) {
  const { lang, onChange } = props;

  const languagesOptions = languages
    .map(({ lang, label, labelLocal }) => ({
      label: `${label} - ${labelLocal}`,
      value: lang,
    }))
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

  return (
    <div>
      <Select
        {...(props.id ? { id: props.id } : {})}
        cacheOptions
        options={languagesOptions}
        onChange={({ value }) => onChange(value)}
        value={languagesOptions.find((opt) => lang === opt.value)}
        placeholder="Pick a language ..."
        components={{
          IndicatorSeparator: () => null,
        }}
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
          dropdownIndicator: (provided) => ({
            ...provided,
            cursor: 'pointer',
          }),
        }}
      />
    </div>
  );
}
