import React from 'react';
import ReactDOM from 'react-dom';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './style.css';

import * as util from './util';
import * as wiki from './wiki';
import {Sidebar} from './sidebar';

function Root(props) {
  return (
    <Sidebar data={props.data} />
  );
};

console.log('content_script is running!');

function initToast() {
  // inject toast right away
  const toastEl = document.createElement('div');
  document.body.appendChild(toastEl);
  ReactDOM.render(
    <ToastContainer
      position={toast.POSITION.TOP_LEFT}
      autoClose={5000}
      style={{
        fontSize: '0.8em'
      }}
    />,
    toastEl
  );
}

function onDisconnected() {
  const onRefresh = () => window.location.reload();
  toast(() => (
    <div>You are disconnected! Refresh this page to reconnect! <a onClick={onRefresh}>(refresh now)</a></div>
  ), {
    autoClose: false,
  });
}

function init() {
  console.log('init called');

  initToast();

  const rootEl = document.getElementById('mw-panel');
  let el;
  let rendered = false;
  function render(data, initData = false) {
    if (!data || (rendered && initData)) return;
    rendered = true;
    el = ReactDOM.render(<Root data={data} />, rootEl, el);
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

        case 'room_change_prompt':
          const confirmMessage = `You are currently playing in room ${message.data.old}. You sure you want to join room ${message.data.new}? (You will be removed from the old room)`;
          sendResponse({ confirm: window.confirm(confirmMessage) });
          return false;

        case 'disconnected':
          onDisconnected();
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

  const initData = username => {
    chrome.runtime.sendMessage({
      type: 'init',
      roomId: util.getRoomId(),
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

      // this (supposedly) resolves inactive background page
      const pingInterval = setInterval(() => {
        try {
          chrome.runtime.sendMessage({ type: 'ping' }, reply => {
            if (!reply || !reply.status) {
              clearInterval(pingInterval);
              onDisconnected();
            }
          });
        } catch (e) {
          clearInterval(pingInterval);
          console.log('ping error:', e);
          onDisconnected();
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
              }
              util.goto(lastArticle);
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
