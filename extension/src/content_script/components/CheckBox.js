import React, { useState, useEffect } from 'react';

export function CheckBox(props) {
  const { label, disabled, onChange, onShowInfo, infoTitle } = props;

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
          onChange={(e) => {
            setChecked(e.target.checked);
            onChange(e.target.checked);
          }}
        />
        {label}
      </label>
      {onShowInfo ? (
        <>
          &nbsp;
          <a
            title={infoTitle || `Show info about "${label}"`}
            onClick={onShowInfo}
            style={{ fontSize: '0.75em' }}
          >
            🛈
          </a>
        </>
      ) : null}
    </div>
  );
}
