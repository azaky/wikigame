import React from 'react';

export function Header(props) {
  const {username, roomId} = props;

  // TODO: display roomId and link
  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3 style={{fontSize: '1em'}}>
        <span>Welcome to Wikigame, <b>{username}</b>!</span>
      </h3>
    </nav>
  );
}
