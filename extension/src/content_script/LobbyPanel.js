import React from 'react';
import { toast } from 'react-toastify';
import {
  Wrapper,
  Header,
  Leaderboard,
  LastRoundOverview,
  NextRoundArticlePicker,
  Rules,
} from './components';
import { useData } from './DataContext';

export function LobbyPanel() {
  const data = useData();
  const { currentRound, rules, leaderboard, lastRound, players, isHost } = data;

  const onUpdate = (toUpdate, callback) => {
    if (!isHost) return;
    chrome.runtime.sendMessage(
      {
        type: 'update',
        data: toUpdate,
      },
      (reply) => {
        if (callback) callback(reply);
      }
    );
  };

  const onStartArticleChange = (title, callback) => {
    console.log('onStartArticleChange', title);
    onUpdate({ currentRound: { start: title } }, callback);
  };

  const onTargetArticleChange = (title, callback) => {
    console.log('onTargetArticleChange', title);
    onUpdate({ currentRound: { target: title } }, callback);
  };

  const onRulesChange = (newRules, callback) => {
    console.log('onRulesChange', newRules);
    onUpdate({ rules: newRules }, callback);
  };

  const onStartRound = () => {
    console.log('onStartRound!');
    if (!isHost) return;
    if (!currentRound.start || !currentRound.target) {
      toast.error('Start and Target article must not be empty!');
      return;
    }
    chrome.runtime.sendMessage({ type: 'start' });
  };

  const onTransferHost = (newHost, callback) => {
    console.log('onTransferHost', newHost);
    if (!isHost || !players.includes(newHost)) {
      if (callback) callback();
      return;
    }
    if (
      window.confirm(
        `You're about to transfer host to ${newHost}. Are you sure?`
      )
    ) {
      onUpdate({ host: newHost }, callback);
    }
  };

  const onSwapArticles = (callback) => {
    console.log('onSwapArticles');
    onUpdate(
      {
        currentRound: {
          start: currentRound.target,
          target: currentRound.start,
        },
      },
      callback
    );
  };

  console.log('LobbyPanel!', data);

  return (
    <Wrapper>
      <Header />
      {leaderboard && leaderboard.length ? (
        <Leaderboard onTransferHost={onTransferHost} />
      ) : null}
      <NextRoundArticlePicker
        round={currentRound}
        disabled={!isHost}
        onStartArticleChange={onStartArticleChange}
        onTargetArticleChange={onTargetArticleChange}
        onSwapArticles={onSwapArticles}
        onStartRound={onStartRound}
      />
      {lastRound ? <LastRoundOverview round={lastRound} /> : null}
      <Rules rules={rules} disabled={!isHost} onRulesChange={onRulesChange} />
    </Wrapper>
  );
}
