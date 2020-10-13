import React, {useEffect, useState} from 'react';
import {Leaderboard, CurrentRound} from './widgets';

export function Sidebar(props) {
  const {data} = props;

  switch (data.state) {
    case 'lobby':
      return <LobbySidebar data={data} />;
    
    case 'playing':
      return <GameSidebar data={data} />;
    
    default:
      console.error('Sidebar called with unknown data.state:', data.state);
      return null;
  }
}

function Header(props) {
  const {username} = props;
  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3 style={{fontSize:'1em'}}>
        <span>Welcome to Wikigame, <b>{username}</b>!</span>
      </h3>
    </nav>
  );
}

function LobbySidebar(props) {
  console.log('LobbySidebar:', props);

  const {data} = props;
  const {currentRound, rules, leaderboard, lastRound, host, username } = data;
  const isHost = host === username;

  return (
    <div id="wikigame-wrapper">
      <Header username={username} />
      {
        (leaderboard && leaderboard.length)
          ? <Leaderboard
              leaderboard={leaderboard}
              host={host}
              username={username}
            />
          : null
      }
      <CurrentRound
        round={currentRound}
        rules={rules}
        disabled={!isHost}
        onStartArticleChange={e => {
          console.log('onStartArticleChange', e);
        }}
        onTargetArticleChange={e => {
          console.log('onTargetArticleChange', e);
        }}
        onStartRound={e => {
          console.log('onStartRound', e);
        }}
        onRulesChange={e => {
          console.log('onRulesChange', e);
        }}
      />
    </div>
  );
}
