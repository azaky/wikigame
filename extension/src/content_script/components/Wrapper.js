import React from 'react';

export function Wrapper(props) {
  return (
    <div id="wikigame-wrapper">
      {props.children}
    </div>
  );
}