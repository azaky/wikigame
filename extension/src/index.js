import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom';

import * as util from './util';
import {Sidebar} from './sidebar';

// resolves ReferenceError: regeneratorRuntime is not defined
// https://stackoverflow.com/a/61517521/6662136
// import * as _chrome from './chrome';
// import 'regenerator-runtime/runtime';
// import 'core-js/stable';

function Root(props) {
  const currentArticle = util.getCurrentArticle();
  console.log('currentArticle:', currentArticle);

  let [data, setData] = useState(null);

  // init
  useEffect(() => {
    console.log('init called');
    chrome.runtime.sendMessage({
      type: 'init',
      roomId: util.getRoomId(),
    }, _data => {
      console.log('init data:', _data);
      setData(_data);

      if (!data || !data.roomId) return;

      if (data.error) {
        alert(`Encountered error: ${data.error}`);
        return;
      }

      // this (supposedly) resolves inactive background page
      const pingInterval = setInterval(() => {
        try {
          chrome.runtime.sendMessage({ type: 'ping' }, reply => {
            if (!reply || !reply.status) {
              clearInterval(pingInterval);
              alert('You are disconnected! Refresh this page to reconnect');
              // TODO: apply visual hint other than alert to indicate disconnection
            }
          });
        } catch (e) {
          clearInterval(pingInterval);
          console.log('ping error:', e);
          alert('You are disconnected! Refresh this page to reconnect');
        }
      }, 1000);

      util.setRoomIdOnUrl(data.roomId);
    });
  }, []);

  // message listener
  useEffect(() => {
    chrome.runtime.onMessage.addListener(
      (message, sender, sendResponse) => {
        console.log('got message from background:', message);

        switch (message.type) {
          case 'username_prompt':
            // const username = window.prompt('Enter your username:');
            sendResponse({ username: 'a' });
            return true;

          case 'update':
            setData(message.data);
            break;
          
          case 'start':
            util.goto(message.data.currentRound.start);
            break;

          case 'finished':
            setData(message.data);
            alert('Round is finished!');
            break;

          case 'room_change_prompt':
            const confirmMessage = `You are currently playing in room ${message.data.old}. You sure you want to join room ${message.data.new}? (You will be removed from the old room)`;
            sendResponse({ confirm: window.confirm(confirmMessage) });
            return true;

          case 'disconnected':
            alert('You are disconnected! Refresh this page to reconnect');
            // TODO: apply visual hint other than alert to indicate disconnection
            break;

          default:
            console.warn('unknown message type:', message.type);
        }

        return false;
      }
    )
  }, []);

  if (!data) {
    return null;
  }

  console.log('Root: data:', data);

  // const chromeData = await _chrome.getLocalStorage(null);
  // console.log('Root: chrome data:', data);

  // // handle local states like click, setStartArticle, setTargetArticle, setBannedArticle
  // if (data.state === 'playing' && !data.currentState.finished) {
  //   const lastArticle = data.currentState.path.slice(-1)[0] || data.currentRound.start;

  //   if (data.localState === 'clicking') {
      
  //     chrome.runtime.sendMessage({
  //       type: 'click',
  //       data: { article: currentArticle },
  //     }, (reply) => {
  //       chrome.storage.local.set({ localState: null }, () => {
  //         if (!reply || !reply.valid) {
  //           if (reply.message) alert(reply.message);
  //           goto(lastArticle);
  //         } else {
  //           if (reply.currentState.finished) {
  //             alert(`You reached the target! Your score is ${reply.currentState.score}`);
  //           }
  //           loadGame({ ...data, currentState: reply.currentState });
  //         }
  //       });
  //     });
  //   } else if (lastArticle !== currentArticle) {
  //     // prevent infinite loop by introducing invalid state
  //     if (data.localState === 'invalid') {
  //       console.error('We\'re in invalid state! Will stay on this article to prevent infinite redirects');
  //       chrome.storage.local.set({ localState: null }, () => {
  //         loadGame(data);
  //       });
  //     } else {
  //       chrome.storage.local.set({ localState: 'invalid' }, () => {
  //         goto(lastArticle);
  //       });
  //     }
  //   } else {
  //     // when we're on this state, possibly due to reloads
  //     loadGame(data);
  //   }
  // // handle set with current article
  // } else if (data.state === 'lobby' && (data.localState === 'setStartArticle' || data.localState === 'setTargetArticle')) {
  //   loadLobby(data);
  //   const { localState } = data;
  //   chrome.storage.local.set({ localState: null }, () => {
  //     chrome.runtime.sendMessage({
  //       type: 'update',
  //       data: { currentRound: { [localState === 'setStartArticle' ? 'start' : 'target']: currentArticle } },
  //     });
  //   });
  // } else {
  //   loadUI(data);
  // }

  return (
    <Sidebar data={data} />
  );
};

console.log('content_script is running!');

ReactDOM.render(
  <Root />,
  document.getElementById('mw-panel')
);
