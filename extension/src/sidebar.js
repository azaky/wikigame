import React, {useEffect} from 'react';
import {Leaderboard, CurrentRoundOverview, LastRoundOverview, NextRoundArticlePicker, Rules} from './widgets';
import * as util from './util';

function Header(props) {
  const {username} = props;
  return (
    <nav class="vector-menu vector-menu-portal portal">
      <h3 style={{fontSize: '1em'}}>
        <span>Welcome to Wikigame, <b>{username}</b>!</span>
      </h3>
    </nav>
  );
}

function LobbySidebar(props) {
  const {data} = props;
  const {currentRound, rules, leaderboard, lastRound, host, username } = data;
  const isHost = host === username;

  const onStartArticleChange = title => {
    console.log('onStartArticleChange', title);
    if (!isHost) return;
    chrome.runtime.sendMessage({
      type: 'update',
      data: { currentRound: { start: title } },
    });
  };

  const onTargetArticleChange = title => {
    console.log('onTargetArticleChange', title);
    if (!isHost) return;
    chrome.runtime.sendMessage({
      type: 'update',
      data: { currentRound: { target: title } },
    });
  };

  const onRulesChange = newRules => {
    console.log('onRulesChange', newRules);
    if (!isHost) return;
    chrome.runtime.sendMessage({
      type: 'update',
      data: { rules: newRules },
    });
  };

  const onStartRound = () => {
    console.log('onStartRound!');
    if (!isHost) return;
    if (!currentRound.start || !currentRound.target) {
      alert('Start and Target article must not be empty!');
      return;
    }
    chrome.runtime.sendMessage({ type: 'start' });
  };

  const onTransferHost = (newHost) => {
    console.log('onTransferHost', newHost);
    if (!isHost) return;
    chrome.runtime.sendMessage({
      type: 'update',
      data: { host: newHost },
    });
  };

  return (
    <div id="wikigame-wrapper">
      <Header username={username} />
      {
        (leaderboard && leaderboard.length)
          ? <Leaderboard
              leaderboard={leaderboard}
              host={host}
              username={username}
              onTransferHost={onTransferHost}
            />
          : null
      }
      <NextRoundArticlePicker
        round={currentRound}
        disabled={!isHost}
        onStartArticleChange={onStartArticleChange}
        onTargetArticleChange={onTargetArticleChange}
        onStartRound={onStartRound}
      />
      {
        lastRound
          ? <LastRoundOverview
              round={lastRound}
            />
          : null
      }
      <Rules
        rules={rules}
        disabled={!isHost}
        onRulesChange={onRulesChange}
      />
    </div>
  );
}

function GameSidebar(props) {
  const {data} = props;
  const {currentState, currentRound, rules, username} = data;

  // enforce rules
  useEffect(() => {
    console.log('enforce rules!');
    if (currentState.finished) return;

    // remove search bar
    document.getElementById('simpleSearch').remove();

    // ctrl+f
    if (typeof rules.allowCtrlf === 'boolean' && !rules.allowCtrlf) {
      window.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
          e.preventDefault();
          alert('Oops, Ctrl+F is not allowed!');
        }
      });
    }
  }, [currentState.finished]);

  // override a.click
  useEffect(() => {
    const links = document.getElementsByTagName('a');
    if (currentState.finished) return;

    for (let i = 0; i < links.length; i++) {
      links[i].onclick = (function (target) {
        return function (e) {
          const link = target.href;
          console.log('Clicking:', link);

          const articleObj = util.getArticleFromUrl(link);
          const { article } = articleObj;

          // anchor links
          if (article === util.getCurrentArticle()) {
            console.log(`Anchor link, doesn't count as a click:`, link);
            return;
          }

          e.preventDefault();

          // non-wiki links
          if (!article) {
            console.log('Ignoring invalid links:', link);
            return;
          }

          // special links
          if (util.isSpecialArticle(article)) {
            console.log('Ignoring special links:', link);
            return;
          }

          console.log('Navigating to:', article);

          chrome.storage.local.get(['localState'], ({localState}) => {
            if (localState === 'clicking') {
              console.log(`Ignoring clicks, there's another ongoing clicking event`);
              return;
            }
            chrome.storage.local.set({localState: 'clicking'}, () => {
              util.goto(article);
            });
          });
        };
      }(links[i]));
    }
  }, [currentState.finished]);

  return (
    <div id="wikigame-wrapper">
      <Header username={username} />
      <CurrentRoundOverview
        round={currentRound}
        currentState={currentState}
      />
      <Rules
        rules={rules}
        disabled={true}
      />
    </div>
  );
}

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
