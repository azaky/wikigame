import React from 'react';

export function Wrapper(props) {
  // double div is for putting scrollbar to the left (see styles/style.css)
  return (
    <div id="wikigame-wrapper"><div>
      {props.children}
    </div></div>
  );
}