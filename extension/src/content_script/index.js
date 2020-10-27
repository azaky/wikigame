import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ToastContainer, toast } from 'react-toastify';

import * as util from './util';
import { LobbyPanel } from './LobbyPanel';
import { InGamePanel } from './InGamePanel.js';
import DataContext from './DataContext';
import { isOnInstalled, onInstalled, onInstalledPlay } from './welcome';

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

// hacks to pass lang to popup
chrome.storage.local.set({ pageLang: util.getAddrLang() });

function Root(props) {
  const { data } = props;

  useEffect(() => {
    removeHandleCtrlfOnInitialLoad();
  }, []);

  switch (data.state) {
    case 'lobby':
      return (
        <DataContext.Provider value={data}>
          <LobbyPanel />
        </DataContext.Provider>
      );

    case 'playing':
      return (
        <DataContext.Provider value={data}>
          <InGamePanel />
        </DataContext.Provider>
      );

    default:
      onShouldReload(`There's a problem loading Wikigame. Please reload`);
      console.error('Root called with unknown data.state:', data.state);
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
    try {
      chrome.storage.local.get(['state'], ({ state }) => {
        if (!state) return;

        showToast();
      });
    } catch (e) {
      console.log('get state in onShouldReload error:', e);
      showToast();
    }
  } else {
    // possibly we're in the middle of reloading/updating the extension
    showToast();
  }
}

function onReconnected() {
  toast.dismiss('reload');
  toast.info('You are reconnected! Welcome back!');
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
  chrome.runtime.sendMessage({ type: 'leave' });
}

function handleMultipleTabs() {
  removeWholeContent();
  restoreFavicon();
  toast.dismiss();

  const changeTab = () => {
    chrome.runtime.sendMessage({ type: 'change_tab' }, (reply) => {
      util.setRoomIdOnUrl(reply.roomId, reply.lang);
      util.goto(reply.lastArticle || util.getCurrentArticle());
    });
  };

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
    toastId: 'multipleTabs',
    closeOnClick: false,
    closeButton: false,
    position: toast.POSITION.TOP_CENTER,
    autoClose: false,
  });
}

const rootEl = document.getElementById('mw-panel');
let reactEl;
let rendered = false;
function render(data, possiblyObsolete = false) {
  if (!data || (rendered && possiblyObsolete)) return;
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

const initData = ({ username, roomId, lang }) => {
  if (!lang) lang = util.getLang();

  const initMessage = {
    type: 'init',
    roomId,
    lang,
    username,
  };
  chrome.runtime.sendMessage(initMessage, onInitData);
};

const onInitData = (data) => {
  console.log('initData:', data);

  if (data && data.error) {
    removeHandleCtrlfOnInitialLoad();
    if (data.error.startsWith('Duplicated username')) {
      const newUsername = window.prompt(data.error);
      if (newUsername) {
        setTimeout(() => {
          initData({
            username: newUsername,
            roomId: data.roomId,
            lang: data.lang,
          });
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

    if (isOnInstalled()) {
      onInstalled();
      return;
    }

    return;
  }

  util.setRoomIdOnUrl(data.roomId, data.lang);
  const currentArticle = util.getCurrentArticle();

  // check if language mismatched
  if (data.lang !== util.getAddrLang()) {
    // on initial, redirect to data.url instead
    if (data.initial) {
      window.location.href = data.url || util.getCurrentArticle();
    } else {
      console.log('Language mismatched!');
      toast.error('You cannot go to pages in other languages!');
      setTimeout(() => {
        util.goto(currentArticle);
      }, 1000);
    }
    return;
  }

  changeFavicon();
  if (data.initial) {
    chrome.storage.local.set({ initial: null }, () => {
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

      // show additional help on install
      if (isOnInstalled()) {
        onInstalledPlay();
      }
    });
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

            render(data, !data.initial);
          }
        }
      );
    } else if (lastArticle !== currentArticle) {
      // when in doubt, ask server are we allowed to go here?
      chrome.runtime.sendMessage(
        {
          type: 'navigate',
          data: { article: currentArticle },
        },
        (response) => {
          if (response && response.success) {
            render(data, !data.initial);
          } else {
            toast.error(
              'Oops, you cannot go here! Did you try to cheat? Sending you back to last article...'
            );
            setTimeout(() => {
              chrome.storage.local.set({ localState: null }, () => {
                util.goto(lastArticle);
              });
            }, 1000);
          }
        }
      );
    } else {
      render(data, !data.initial);
    }
  } else {
    render(data, !data.initial);
  }
};

function onMessageListener(message, sender, sendResponse) {
  console.log('got message from background:', message);
  console.log(JSON.stringify(message));

  switch (message.type) {
    case 'init':
      onInitData(message.data);
      break;

    case 'username_prompt':
      const username = window.prompt('Enter your username:');
      sendResponse({ username });
      return false;

    case 'update':
      // on language changed
      if (message.data.lang !== util.getAddrLang()) {
        util.setRoomIdOnUrl(message.data.roomId, message.data.lang);
        util.goto(util.getCurrentArticle());
      } else {
        render(message.data);
      }
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

    case 'reconnected':
      onReconnected();
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
}

function init() {
  console.log('init called');

  chrome.runtime.onMessage.addListener(onMessageListener);
  initToast();
  initData(util.getRoomIdAndLang());
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
}, 100);
