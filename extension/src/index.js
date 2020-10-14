import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom';

import * as util from './util';
import {Sidebar} from './sidebar';

function Root(props) {
  const currentArticle = util.getCurrentArticle();
  console.log('currentArticle:', currentArticle);

  let [data, setData] = useState(props.data);

  useEffect(() => {
    setData(props.data);
  }, [props.data]);

  console.log('Root: data:', data);

  // this (supposedly) resolves inactive background page
  useEffect(() => {
    console.log('set ping interval');
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
  }, []);

  // handle clicking
  // TODO: this can (and should) be moved to server-side
  useEffect(() => {
    if (data.state === 'playing' && !data.currentState.finished) {
      const lastArticle = data.currentState.path.slice(-1)[0] || data.currentRound.start;

      if (data.localState === 'clicking') {
        chrome.runtime.sendMessage({
          type: 'click',
          data: { article: currentArticle },
        }, (reply) => {
          chrome.storage.local.set({ localState: null }, () => {
            if (!reply || !reply.valid) {
              if (reply.message) {
                alert(reply.message);
              }
              util.goto(lastArticle);
            } else {
              if (reply.currentState.finished) {
                alert(`You reached the target! Your score is ${reply.currentState.score}`);
              }
              setData({ ...data, currentState: reply.currentState });
            }
          });
        });
      } else if (lastArticle !== currentArticle) {
        // prevent infinite loop by introducing invalid state
        if (data.localState === 'invalid') {
          console.error('We\'re in invalid state! Will stay on this article to prevent infinite redirects');
          chrome.storage.local.set({ localState: null });
        } else {
          chrome.storage.local.set({ localState: 'invalid' }, () => {
            util.goto(lastArticle);
          });
        }
      }
    }
  }, [data.state, data.localState]);

  return (
    <Sidebar data={data} />
  );
};

console.log('content_script is running!');

function init() {
  console.log('init called');

  const rootEl = document.getElementById('mw-panel');
  let el;
  let initialRender = false;
  function render(data) {
    if (!data || !initialRender) return;
    el = ReactDOM.render(<Root data={data} />, rootEl, el);
  }

  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      console.log('got message from background:', message);

      switch (message.type) {
        case 'username_prompt':
          // const username = window.prompt('Enter your username:');
          sendResponse({ username: 'a' });
          return true;

        case 'update':
          render(message.data);
          break;
        
        case 'start':
          util.goto(message.data.currentRound.start);
          break;

        case 'finished':
          render(message.data);
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
  );

  chrome.runtime.sendMessage({
    type: 'init',
    roomId: util.getRoomId(),
  }, data => {
    console.log('init data:', data);

    if (!data || !data.roomId) return;

    if (data.error) {
      alert(`Encountered error: ${data.error}`);
      return;
    }

    util.setRoomIdOnUrl(data.roomId);

    initialRender = true;
    render(data);
  });
}

// wait for readyState === 'complete'
// to ensure that page finishes loading and redirects are completed
const documentReadyInterval = setInterval(() => {
  if (document.readyState === 'complete') {
    clearInterval(documentReadyInterval);
    init();
  }
}, 10);

