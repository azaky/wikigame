import React from 'react';
import ReactDOM from 'react-dom';
import { ToastContainer, toast } from 'react-toastify';

import * as util from './util';
import * as wiki from './wiki';
import { LobbyPanel } from './LobbyPanel';
import { InGamePanel } from './InGamePanel.js';

import 'react-toastify/dist/ReactToastify.css';
import './styles/style.css';

function onShouldReload(message) {
  const reload = () => window.location.reload();
  const defaultMessage = 'You are disconnected! Reload this page to reconnect!';

  const showToast = () => {
    toast(() => (
      <div>{message || defaultMessage} <a onClick={reload}>(reload now)</a></div>
    ), {
      autoClose: false,
      toastId: 'reload',
    });
  };

  // do not show toast if we voluntarily left the game
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['state'], ({state}) => {
      if (!state) return;

      showToast();
    });
  } else {
    // possibly we're in the middle of reloading/updating the extension
    showToast();
  }
}

function Root(props) {
  const {data} = props;

  switch (data.state) {
    case 'lobby':
      return <LobbyPanel data={data} />;
    
    case 'playing':
      return <InGamePanel data={data} />;

    default:
      onShouldReload(`There's a problem loading Wikigame. Please reload`)
      console.error('Root called with unknown data.state:', data.state);
      toast.error('')
      return null;
  }
};

function initToast() {
  const toastEl = document.createElement('div');
  document.body.appendChild(toastEl);
  ReactDOM.render(
    <ToastContainer
      position={toast.POSITION.TOP_LEFT}
      autoClose={5000}
      style={{
        fontSize: '0.8em'
      }}
      hideProgressBar={true}
    />,
    toastEl
  );
}

function init() {
  console.log('init called');

  // inject toast right away
  // but do not let it blocks
  setTimeout(() => { initToast(); }, 0);

  const rootEl = document.getElementById('mw-panel');
  let reactEl;
  let rendered = false;
  function render(data, initData = false) {
    if (!data || (rendered && initData)) return;
    if (!rendered) {
      // resize panel
      document.getElementById('content').style.marginLeft = '13em';
      document.getElementById('left-navigation').style.marginLeft = '13em';
      rootEl.style.width = '12em';
      rootEl.style.paddingLeft = '0';
    }
    reactEl = ReactDOM.render(<Root data={data} />, rootEl, reactEl);
    rendered = true;
  }

  function enablePanelTransitionAnimation() {
    document.getElementById('content').style.transition = 'all 1s';
    document.getElementById('left-navigation').style.transition = 'all 1s';
    rootEl.style.transition = 'all 1s';
  }

  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      console.log('got message from background:', message);

      switch (message.type) {
        case 'username_prompt':
          const username = window.prompt('Enter your username:');
          sendResponse({ username });
          return false;

        case 'update':
          render(message.data);
          break;

        case 'start':
          util.goto(message.data.currentRound.start);
          break;

        case 'finished':
          toast.info('Round is finished!');
          render(message.data);
          break;

        case 'set_room_id':
          initData(message.data.username, message.data.roomId);
          break;

        case 'room_change_prompt':
          const confirmMessage = `You are currently playing in room ${message.data.old}. You sure you want to join room ${message.data.new}? (You will be removed from the old room)`;
          sendResponse({ confirm: window.confirm(confirmMessage) });
          return false;

        case 'disconnected':
          onShouldReload();
          break;

        case 'notification':
          switch (message.data.type) {
            case 'error':
              toast.error(message.data.message);
              break;
            
            case 'warning':
              // toast.warn color hurts your eye, trust me
              toast.error(message.data.message);
              break;
            
            case 'info':
              toast.info(message.data.message);
              break;

            case 'notification':
              toast(message.data.message, {position: toast.POSITION.BOTTOM_LEFT});
              break;

            default:
              toast(`${message.data.type}: ${message.data.message}`);
          }
          break;

        default:
          console.warn('unknown message type:', message.type);
      }

      sendResponse(null);
      return false;
    }
  );

  const initData = (username, roomId) => {
    chrome.runtime.sendMessage({
      type: 'init',
      roomId: roomId || util.getRoomId(),
      username: username,
    }, data => {
      console.log('initData:', data);

      if (data && data.error) {
        if (data.error.startsWith('Duplicated username')) {
          const newUsername = window.prompt(data.error);
          if (newUsername) {
            setTimeout(() => {
              initData(newUsername);
            }, 0);
          }
          return;
        }
        toast.error(`Error on initializing wikigame: ${data.error}`);
        return;
      }

      if (!data || !data.roomId) return;

      if (data.initial) {
        toast(() => <div>Welcome to Wikigame, <b>{data.username}</b>!</div>);
        // animate resize only when joining for the first time
        enablePanelTransitionAnimation();
      }

      // this (supposedly) resolves inactive background page
      const pingInterval = setInterval(() => {
        try {
          chrome.runtime.sendMessage({ type: 'ping' }, reply => {
            if (!reply || !reply.status) {
              clearInterval(pingInterval);
              onShouldReload();
            }
          });
        } catch (e) {
          clearInterval(pingInterval);
          console.log('ping error:', e);
          onShouldReload();
        }
      }, 1000);

      util.setRoomIdOnUrl(data.roomId);
      const currentArticle = util.getCurrentArticle();

      // click checks
      if (data.state === 'playing' && !data.currentState.finished) {
        const lastArticle = data.currentState.path.slice(-1)[0] || data.currentRound.start;
  
        if (data.localState === 'clicking') {
          chrome.runtime.sendMessage({
            type: 'click',
            data: { article: currentArticle },
          }, reply => {
            if (!reply || !reply.success) {
              if (reply.message) {
                toast.error(reply.message);
                // Wait 1s so the user is aware of the error
                // Think of it as additional penalty for going to an invalid link
                setTimeout(() => {
                  util.goto(lastArticle);
                }, 1000);
              } else {
                util.goto(lastArticle);
              }
            } else {
              // win condition checks
              if (reply.data && reply.data.finished) {
                toast.success(`You reach the target! Your score is ${reply.data.score}`);
              }
  
              render(data, true);
            }
          });
        } else if (lastArticle !== currentArticle) {
          // resolve redirects for one more time
          wiki.resolveTitle(currentArticle)
            .then(resolved => {
              if (resolved === lastArticle) {
                render(data, true);
              } else {
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
            })
            .catch(err => {
              console.error('Error resolving title!', err);
  
              // keep rendering on this case
              render(data, true);
            });
        } else {
          render(data, true);
        } 
      } else {
        render(data, true);
      }
    });
  };

  initData();
}

console.log('content_script is running!');

// wait for readyState === 'complete'
// to ensure that page finishes loading and redirects are completed
const documentReadyInterval = setInterval(() => {
  if (document.readyState === 'complete') {
    clearInterval(documentReadyInterval);

    // Hacks to make sure that a connection between background and content script is established.
    // When this port is active, then we can be sure that it's safe to send message both ways.
    chrome.runtime.sendMessage({type: 'init_port'}, reply => {
      chrome.runtime.connect({name: `tabId:${reply.tabId}`});
      init();
    });
  }
}, 10);
