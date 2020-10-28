import io from 'socket.io-client';
import mergeDeepRight from 'ramda/src/mergeDeepRight';

const serverUrl = process.env.WIKIGAME_SERVER_URL;

let active = false;
let socket;
let tabId;
let portOpen = {};
let pingTimeout;

chrome.runtime.onConnect.addListener((port) => {
  console.log('received port connection:', port.name);
  try {
    const portTabId = parseInt(port.name.replace(/^tabId\:/, ''), 10);
    if (portTabId !== NaN) {
      console.log('port open from tab', portTabId);
      portOpen[portTabId] = true;
      port.onDisconnect.addListener(() => {
        console.log('port closed');
        portOpen[portTabId] = false;
      });
    }
  } catch (e) {
    console.warn('error processing port:', e);
  }
});

function reset(callback) {
  if (socket && socket.connected) {
    socket.close();
  }
  active = false;
  chrome.storage.local.set(
    {
      roomId: null,
      url: null,
      host: null,
      state: null,
      localState: null,
      players: null,
      currentRound: null,
      currentState: null,
      rules: null,
      leaderboard: null,
      lastRound: null,
      pastRounds: null,
    },
    () => {
      console.log('State is reset!');
      if (callback) callback();
    }
  );
}

function resetPingTimeout() {
  if (pingTimeout) clearTimeout(pingTimeout);
  pingTimeout = setTimeout(() => {
    console.log('Been idle for 60 seconds, will disconnect self');
    reset(() => {
      tabId = null;
    });
  }, 60000);
}

const messageBuffer = [];

function sendMessageToTab(toTabId, type, data, callback) {
  chrome.tabs.sendMessage(parseInt(toTabId, 10), { type, data }, (response) => {
    if (chrome.runtime.lastError) {
      console.log(
        'error sendMessage to tabId',
        toTabId,
        chrome.runtime.lastError.message
      );
      if (callback) callback(null);
      return;
    }
    if (callback) callback(response);
  });
}

function sendMessage(type, data, callback) {
  if (!tabId) {
    console.error(
      'sendMessage is called when tabId is not defined! data:',
      type,
      data
    );
    if (callback) callback(null);
    return;
  }

  messageBuffer.push({ type, data, callback });

  if (!portOpen[tabId]) {
    console.log(
      'sendMessage is called when port is closed (possibly on reload)',
      type,
      data
    );
    return;
  } else {
    messageBuffer.splice(0).forEach((message) => {
      try {
        chrome.tabs.sendMessage(
          tabId,
          { type: message.type, data: message.data },
          (response) => {
            if (chrome.runtime.lastError) {
              console.log(
                'error sendMessage to tabId',
                tabId,
                chrome.runtime.lastError.message
              );
              if (message.callback) message.callback(null);
              return;
            }
            console.log('sendMessage response:', response);
            if (message.callback) message.callback(response);
          }
        );
      } catch (e) {
        console.log('error sendMessage to tabId', tabId, e);
        if (message.callback) message.callback(null);
      }
    });
  }
}

function sendNotification(type, message, callback) {
  sendMessage('notification', { type, message }, callback);
}

let updateDataLock = false;
function updateData(data, callback) {
  // prevent race condition
  if (!updateDataLock) {
    updateDataLock = true;
    chrome.storage.local.get(null, (localData) => {
      const updated = mergeDeepRight(localData, data);
      chrome.storage.local.set(updated, () => {
        updateDataLock = false;
        if (callback) callback(updated);
      });
    });
  } else {
    setTimeout(() => {
      updateData(data, callback);
    }, 10);
  }
}

function initSocketio(initData, realCallback) {
  let callbackCalled = false;
  const callback = (...args) => {
    if (callbackCalled) return;
    if (!realCallback) return;

    callbackCalled = true;
    realCallback(...args);
  };

  const onError = (message, data) => {
    callback({ success: false, error: message, ...data });
  };

  const createQueryParam = (params) =>
    Object.keys(params)
      .filter((k) => params[k])
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');

  const query = createQueryParam({
    username: initData.username,
    mode: initData.mode || 'multi',
    roomId: initData.roomId,
    lang: initData.lang,
  });

  if (socket && socket.connected) {
    console.warn(
      'initSocketio called when existing socket connection still active, will close the existing one'
    );
    socket.close();
  }
  const reconnectionAttempts = 1;
  socket = io(serverUrl, {
    query,
    reconnectionAttempts,
    reconnectionDelay: 0,
  });
  socket.on('connect', () => {
    console.log('socket.io connected!');
  });
  socket.on('disconnect', () => {
    console.log('socket.io disconnected!');
  });
  socket.on('reconnect_failed', () => {
    console.log('reconnection failed after', reconnectionAttempts, 'attempts');
    if (active) {
      active = false;
      sendMessage('disconnected');
    } else {
      onError('Failed to connect to the server');
    }
  });
  socket.on('reconnect', () => {
    active = true;
    sendMessage('reconnected');
  });

  // one time room data on init
  socket.on('init', (data) => {
    active = true;
    console.log('socket.on(init):', data);

    // update query params on reconnect
    const reconnectQuery = createQueryParam({
      username: initData.username,
      roomId: data.roomId,
      lang: data.lang,
      mode: data.mode,
    });
    socket.io.opts.query = reconnectQuery;

    chrome.storage.local.set(Object.assign(data, { initial: true }), () => {
      chrome.storage.local.get(null, callback);
    });
  });

  socket.on('init_error', (data) => {
    console.log('socket.on(init_error):', data);
    socket.close();
    active = false;
    onError(data.message, initData);
  });

  socket.on('update', (data) => {
    console.log('socket.on(update):', data);
    updateData(data, (updated) => {
      sendMessage('update', updated);
    });
  });

  socket.on('start', (data) => {
    console.log('socket.on(start):', data);
    updateData(data, (updated) => {
      sendMessage('start', updated);
    });
  });

  socket.on('finished', (data) => {
    console.log('socket.on(finished):', data);
    updateData(data, (updated) => {
      sendMessage('finished', updated, null);
    });
  });

  socket.on('notification', (data) => {
    console.log('socket.on(notification):', data);
    sendNotification('notification', data.message);
  });
}

function init(data, callback) {
  reset(() => {
    const { username, mode } = data;
    if (username) {
      chrome.storage.local.set({ username }, () => {
        initSocketio(data, callback);
      });
    } else if (mode === 'single') {
      initSocketio(data, callback);
    } else {
      // prompt for username
      console.log('sending username_prompt to tabId', tabId);
      sendMessage('username_prompt', null, (response) => {
        if (!response || !response.username) {
          callback(null);
          return;
        }

        chrome.storage.local.set({ username: response.username }, () => {
          initSocketio(
            Object.assign(data, { username: response.username }),
            callback
          );
        });
      });
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(
    'Message from content_script (tabId =',
    sender && sender.tab && sender.tab.id,
    '):',
    message
  );

  if (message.type === 'init') {
    if (active && socket && socket.connected) {
      chrome.storage.local.get(null, (data) => {
        console.log('sending room change prompt ???');
        // when roomId is different, kick ourself out from the old room and join the new one
        if (message.data.roomId && message.data.roomId !== data.roomId) {
          console.log('sending room change prompt ...');
          sendMessageToTab(
            sender.tab.id,
            'room_change_prompt',
            {
              old: data.roomId,
              mode: data.mode,
              username: data.username,
              new: message.data.roomId,
            },
            (changeRoomResponse) => {
              if (changeRoomResponse && changeRoomResponse.confirm) {
                active = false;
                socket.close();
                tabId = sender.tab.id;
                init(
                  Object.assign({}, message.data, {
                    username: changeRoomResponse.username,
                  }),
                  sendResponse
                );
              } else {
                // handle multiple tabs
                if (tabId !== sender.tab.id) {
                  sendResponse({
                    success: false,
                    error: 'Multiple tabs',
                  });
                }

                // load previous game context if current tab is the same as active tab
                if (sender.tab.id === tabId) {
                  sendResponse(data);
                } else {
                  sendResponse(null);
                }
              }
            }
          );
        } else {
          // handle multiple tabs
          if (tabId !== sender.tab.id) {
            sendResponse({
              success: false,
              error: 'Multiple tabs',
            });
            return;
          }

          // a session is active: return current context
          sendResponse(data);
        }
      });
    } else {
      // if both roomId and username is not defined, then it means that the user
      // does not intentionally start a new game. so we're ignoring that case
      if (!message.data || (!message.data.roomId && !message.data.username)) {
        sendResponse(null);
      } else {
        // on a very rare case -- possibly only on development --
        // when someone inits from two different tabs at the same time,
        // race condition may occur
        if (tabId && tabId !== sender.tab.id) {
          sendResponse({
            success: false,
            error: 'Multiple tabs',
          });
        } else {
          tabId = sender.tab.id;
          init(message.data, sendResponse);
        }
      }
    }
    return true;
  }

  if (message.type === 'init_port') {
    sendResponse({ tabId: sender.tab.id });
    return false;
  }

  if (message.type === 'ping') {
    resetPingTimeout();
    if (active && socket && socket.connected) {
      sendResponse({ status: true });
    } else {
      active = false;
      sendResponse({ status: false });
    }
    return false;
  }

  if (message.type === 'get_status') {
    sendResponse({ active });
  }

  if (message.type === 'init_popup') {
    if (active && socket && socket.connected) {
      // on init popup, do not do anything
      sendResponse({ success: false, error: 'A game is currently active!' });
    } else if (!message.data.username && message.data.mode !== 'single') {
      // on init popup, do not do anything
      sendResponse({ success: false, error: 'Username cannot be empty!' });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          tabId = tabs[0].id;
          init(message.data, (initData) => {
            sendResponse({ success: true });
            sendMessage('init', initData);
          });
        } else {
          sendResponse({
            success: false,
            error:
              'The tab was not focused! Please focus on the tab and try again',
          });
        }
      });
    }
    return true;
  }

  if (message.type === 'change_tab') {
    chrome.storage.local.get(['roomId', 'state', 'currentState'], (data) => {
      const onDelegateTab = () => {
        tabId = sender.tab.id;
        sendResponse({
          roomId: data.roomId,
          lang: data.lang,
          lastArticle:
            data.state === 'playing' && data.currentState.path.slice(-1)[0],
        });
      };
      // inform old tab that we are changing tab
      try {
        sendMessageToTab(tabId, 'change_tab', null, onDelegateTab);
      } catch (e) {
        console.log('error sending change_tab message:', e);
        onDelegateTab();
      }
    });

    return true;
  }

  if (!active || !socket || !socket.connected) {
    console.warn(
      'onMessage called when not active, ignoring. message:',
      message
    );

    // let reply when message is click
    if (message.type === 'click') {
      sendResponse({ success: false });
    } else {
      sendResponse(null);
    }
    return false;
  }

  if (message.type === 'update') {
    console.log('update:', message.data);

    socket.emit('update', message.data, (ack) => {
      if (!ack || !ack.success) {
        if (ack.message) {
          sendNotification('error', ack.message);

          // we call update to reset any obsolete fields
          updateData({}, (updated) => {
            sendMessage('update', updated);
            // For now, this is only for resetting loading state in ArticlePicker
            sendResponse({ error: ack.message });
          });
        }
      } else if (ack.data) {
        updateData(ack.data, (updated) => {
          sendMessage('update', updated);
          sendResponse(null);
        });
      } else {
        sendResponse(null);
      }
    });
    return true;
  } else if (message.type === 'start') {
    console.log('start!');

    socket.emit('start', {}, (ack) => {
      if (!ack || !ack.success) {
        if (ack.message) {
          sendNotification('error', ack.message);
        }
      } else if (ack.data) {
        updateData(ack.data, (updated) => {
          sendMessage('start', updated);
        });
      }
    });
  } else if (message.type === 'click') {
    console.log('click!');

    socket.emit('click', message.data, (ack) => {
      // We need to reset localState *via updateData* to prevent
      // racing condition (and ultimately, deadlocks).
      const toUpdate = { localState: null };
      if (ack.data) {
        Object.assign(toUpdate, { currentState: ack.data });
      }
      updateData(toUpdate, (updated) => {
        // and we need to include updated data here as well
        // since update listener in content script currently
        // has not been active yet.
        sendResponse(Object.assign(ack, { updatedData: updated }));
      });
    });

    return true;
  } else if (message.type === 'leave') {
    reset(() => {
      tabId = null;
      sendResponse({ success: true });
      Object.keys(portOpen).forEach((portTabId) => {
        if (portOpen[portTabId]) {
          sendMessageToTab(portTabId, 'leave');
        }
      });
    });
  } else if (message.type === 'change_lang') {
    socket.emit('change_lang', message.data, (ack) => {
      if (!ack || !ack.success) {
        sendResponse({
          success: false,
          message: ack.message,
        });
      } else {
        sendResponse({ success: true, data: ack.data });
      }
    });

    return true;
  } else if (message.type === 'navigate') {
    socket.emit('navigate', message.data, (ack) => {
      if (!ack || !ack.success) {
        sendResponse({
          success: false,
          message: ack.message,
        });
      } else {
        if (ack.data) {
          updateData({ currentState: ack.data });
        }
        sendResponse({ success: true });
      }
    });

    return true;
  } else {
    console.warn('onMessage unknown message.type:', message);
  }

  sendResponse(null);
  return false;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log(
    `storage change: ${JSON.stringify(changes)} for ${JSON.stringify(areaName)}`
  );
});

if (process.env.FIREFOX) {
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    console.log('tabs updated', tabId, changeInfo, tab);
    if (tab.url.match(/\.wikipedia\.org/)) {
      chrome.pageAction.show(tabId);
    } else {
      chrome.pageAction.hide(tabId);
    }
  });
}

chrome.runtime.onInstalled.addListener((installObject) => {
  if (!process.env.FIREFOX) {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
      chrome.declarativeContent.onPageChanged.addRules([
        {
          conditions: [
            new chrome.declarativeContent.PageStateMatcher({
              pageUrl: { hostSuffix: '.wikipedia.org' },
            }),
          ],
          actions: [new chrome.declarativeContent.ShowPageAction()],
        },
      ]);
    });
  }

  reset(() => {
    chrome.tabs.create(
      { url: 'https://en.wikipedia.org/wiki/Wikiracing?welcome=true' },
      () => {
        console.log('Welcome tab launched');
      }
    );
  });
});
