import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ToastContainer, toast } from 'react-toastify';

import * as util from './util';
import * as wiki from './wiki';
import { LobbyPanel } from './LobbyPanel';
import { InGamePanel } from './InGamePanel.js';

import 'react-toastify/dist/ReactToastify.css';
import './styles/style.css';

// prevent people from clicking ctrl+f before the page loads
// disable ctrl+f on initial load, then remove the listener when render is called
function handleCtrlfOnInitialLoad(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
    e.preventDefault();
  }
}
window.addEventListener('keydown', handleCtrlfOnInitialLoad);
console.log('ctrlf injected');
function removeHandleCtrlfOnInitialLoad() {
  window.removeEventListener('keydown', handleCtrlfOnInitialLoad);
  console.log('ctrlf removed');
}

function onShouldReload(message) {
  const reload = () => window.location.reload();
  const defaultMessage = 'You are disconnected! Reload this page to reconnect!';

  const showToast = () => {
    toast.dismiss();
    toast(
      () => (
        <div>
          {message || defaultMessage} <a onClick={reload}>(reload now)</a>
        </div>
      ),
      {
        autoClose: false,
        toastId: 'reload',
      }
    );
  };

  // do not show toast if we voluntarily left the game
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['state'], ({ state }) => {
      if (!state) return;

      showToast();
    });
  } else {
    // possibly we're in the middle of reloading/updating the extension
    showToast();
  }
}

function Root(props) {
  const { data } = props;

  useEffect(() => {
    removeHandleCtrlfOnInitialLoad();
  }, []);

  switch (data.state) {
    case 'lobby':
      return <LobbyPanel data={data} />;

    case 'playing':
      return <InGamePanel data={data} />;

    default:
      onShouldReload(`There's a problem loading Wikigame. Please reload`);
      console.error('Root called with unknown data.state:', data.state);
      toast.error('');
      return null;
  }
}

function initToast() {
  const toastEl = document.createElement('div');
  toastEl.id = 'wikigame-toast';
  document.body.appendChild(toastEl);
  ReactDOM.render(
    <ToastContainer
      position={toast.POSITION.TOP_LEFT}
      autoClose={5000}
      style={{
        fontSize: '0.8em',
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
  setTimeout(() => {
    initToast();
  }, 0);

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

  function changeFavicon() {
    document.querySelector(
      "link[rel*='shortcut icon']"
    ).href = chrome.runtime.getURL('images/icon-32.png');
  }

  function restoreFavicon() {
    document.querySelector("link[rel*='shortcut icon']").href =
      '/static/favicon/wikipedia.ico';
  }

  function removeWholeContent() {
    // remove everything but do not let ToastContainer get removed
    [...document.body.children].forEach((element) => {
      if (element.id !== 'wikigame-toast') {
        element.remove();
      }
    });
  }

  function changeTab() {
    chrome.runtime.sendMessage({ type: 'change_tab' }, (reply) => {
      console.log('change_tab reply:', reply);
      util.setRoomIdOnUrl(reply.roomId);
      util.goto(reply.lastArticle || util.getCurrentArticle());
    });
  }

  function handleLeaveGame() {
    toast.dismiss();
    toast('You successfully left the room. See you again!', {
      position: toast.POSITION.TOP_CENTER,
    });
    setTimeout(() => {
      // reload but remove roomId
      window.location.href = util.getLink(util.getCurrentArticle());
    }, 1000);
  }

  function leaveGame() {
    chrome.runtime.sendMessage({ type: 'leave' }, () => {
      handleLeaveGame();
    });
  }

  function handleMultipleTabs() {
    removeWholeContent();
    restoreFavicon();

    const message = (
      <div>
        You are playing Wikigame in another tab!
        <br />
        <a onClick={changeTab}>(play here)</a>
        &nbsp;
        <a title="back to browsing Wikipedia like usual" onClick={leaveGame}>
          (leave game)
        </a>
      </div>
    );

    toast(message, {
      toastId: 'multiple_tabs',
      closeOnClick: false,
      closeButton: false,
      position: toast.POSITION.TOP_CENTER,
      autoClose: false,
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('got message from background:', message);

    switch (message.type) {
      case 'init':
        initData(message.data.username, message.data.roomId);
        break;

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

      case 'room_change_prompt':
        const confirmMessage = `You are currently playing in room ${message.data.old}. You sure you want to join room ${message.data.new}? (You will be removed from the old room)`;
        sendResponse({ confirm: window.confirm(confirmMessage) });
        return false;

      case 'disconnected':
        onShouldReload();
        break;

      case 'change_tab':
        handleMultipleTabs();
        break;

      case 'leave':
        handleLeaveGame();
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
            toast(message.data.message, {
              position: toast.POSITION.BOTTOM_LEFT,
            });
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
  });

  const initData = (username, roomId) => {
    chrome.runtime.sendMessage(
      {
        type: 'init',
        roomId: roomId,
        username: username,
      },
      (data) => {
        console.log('initData:', data);

        if (data && data.error) {
          removeHandleCtrlfOnInitialLoad();
          if (data.error.startsWith('Duplicated username')) {
            const newUsername = window.prompt(data.error);
            if (newUsername) {
              setTimeout(() => {
                initData(newUsername);
              }, 0);
            }
            return;
          } else if (data.error.startsWith('Multiple tabs')) {
            handleMultipleTabs();
            return;
          }
          toast.error(`Error on initializing wikigame: ${data.error}`);
          return;
        }

        if (!data || !data.roomId) {
          removeHandleCtrlfOnInitialLoad();
          return;
        }

        changeFavicon();
        if (data.initial) {
          toast(
            () => (
              <div>
                Welcome to Wikigame, <b>{data.username}</b>!
              </div>
            ),
            {
              toastId: 'welcome',
              position: toast.POSITION.BOTTOM_LEFT,
            }
          );
          // animate resize only when joining for the first time
          enablePanelTransitionAnimation();
        }

        // this (supposedly) resolves inactive background page
        const pingInterval = setInterval(() => {
          try {
            chrome.runtime.sendMessage({ type: 'ping' }, (reply) => {
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
          const lastArticle =
            data.currentState.path.slice(-1)[0] || data.currentRound.start;

          if (data.localState === 'clicking') {
            chrome.runtime.sendMessage(
              {
                type: 'click',
                data: { article: currentArticle },
              },
              (reply) => {
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
                    toast.success(
                      `You reach the target! Your score is ${reply.data.score}`
                    );
                  }

                  render(data, true);
                }
              }
            );
          } else if (lastArticle !== currentArticle) {
            // resolve redirects for one more time
            wiki
              .resolveTitle(currentArticle)
              .then((resolved) => {
                if (resolved === lastArticle) {
                  render(data, true);
                } else {
                  chrome.storage.local.set({ localState: null }, () => {
                    util.goto(lastArticle);
                  });
                }
              })
              .catch((err) => {
                console.error('Error resolving title!', err);

                // resort back to lastArticle
                chrome.storage.local.set({ localState: null }, () => {
                  util.goto(lastArticle);
                });
              });
          } else {
            render(data, true);
          }
        } else {
          render(data, true);
        }
      }
    );
  };

  initData(null, util.getRoomId());
}

console.log('content_script is running!');

// wait for readyState === 'complete'
// to ensure that page finishes loading and redirects are completed
const documentReadyInterval = setInterval(() => {
  if (document.readyState === 'complete') {
    clearInterval(documentReadyInterval);

    // Hacks to make sure that a connection between background and content script is established.
    // When this port is active, then we can be sure that it's safe to send message both ways.
    chrome.runtime.sendMessage({ type: 'init_port' }, (reply) => {
      chrome.runtime.connect({ name: `tabId:${reply.tabId}` });
      init();
    });
  }
}, 10);
