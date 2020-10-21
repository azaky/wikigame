import io from 'socket.io-client';
import mergeDeepRight from 'ramda/src/mergeDeepRight';

const serverUrl =
  process.env.WIKIGAME_SERVER_URL ||
  'https://wikigame-multiplayer.herokuapp.com/';

let active = false;
let socket;
let tabId;
let portOpen = {};

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

const messageBuffer = [];

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
      chrome.tabs.sendMessage(
        tabId,
        { type: message.type, data: message.data },
        (response) => {
          console.log('sendMessage response:', response);
          if (message.callback) message.callback(response);
        }
      );
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

  const onError = (message) => {
    callback({ success: false, error: message });
  };

  let query = `username=${encodeURIComponent(initData.username)}`;
  if (initData.roomId) {
    query += `&roomId=${encodeURIComponent(initData.roomId)}`;
  }
  if (initData.lang) {
    query += `&lang=${encodeURIComponent(initData.lang)}`;
  }

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
    // TODO: send warning that indicates flaky connection
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

  // one time room data on init
  socket.on('init', (data) => {
    active = true;
    console.log('socket.on(init):', data);
    chrome.storage.local.set(data, () => {
      chrome.storage.local.get(null, (initData) => {
        callback(Object.assign({}, initData, { initial: true }));
      });
    });
  });

  socket.on('init_error', (data) => {
    console.log('socket.on(init_error):', data);
    socket.close();
    onError(data.message);
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

function init(username, roomId, lang, callback) {
  reset(() => {
    if (username) {
      chrome.storage.local.set({ username }, () => {
        initSocketio({ roomId, username, lang }, callback);
      });
    } else {
      // prompt for username
      console.log('sending username_prompt to tabId', tabId);
      sendMessage('username_prompt', null, (data) => {
        if (!data || !data.username) {
          callback(null);
          return;
        }

        chrome.storage.local.set({ username: data.username }, () => {
          initSocketio({ roomId, lang, username: data.username }, callback);
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
      // handle multiple tabs
      if (tabId !== sender.tab.id) {
        sendResponse({
          success: false,
          error: 'Multiple tabs',
        });
        return false;
      }

      chrome.storage.local.get(null, (data) => {
        // when roomId is different, kick ourself out from the old room and join the new one
        if (message.roomId && message.roomId !== data.roomId) {
          sendMessage(
            'room_change_prompt',
            {
              old: data.roomId,
              new: message.roomId,
            },
            (changeRoomData) => {
              if (changeRoomData && changeRoomData.confirm) {
                active = false;
                socket.close();
                init(
                  data.username,
                  message.roomId,
                  message.lang || 'en',
                  sendResponse
                );
              } else {
                sendResponse(null);
              }
            }
          );
        } else {
          // a session is active: return current context
          sendResponse(data);
        }
      });
    } else {
      // if both roomId and username is not defined, then it means that the user
      // does not intentionally start a new game. so we're ignoring that case
      if (!message.roomId && !message.username) {
        sendResponse(null);
      } else {
        // on a very rare case -- possibly only on development --
        // when someone inits from two different tabs at the same time,
        // race condition may occur
        if (tabId) {
          sendResponse({
            success: false,
            error: 'Multiple tabs',
          });
        } else {
          tabId = sender.tab.id;
          init(
            message.username,
            message.roomId,
            message.lang || 'en',
            sendResponse
          );
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
    if (active && socket && socket.connected) {
      sendResponse({ status: true });
    } else {
      active = false;
      sendResponse({ status: false });
    }
    return false;
  }

  if (message.type === 'init_popup') {
    if (active && socket && socket.connected) {
      // on init popup, do not do anything
      console.log('active || !username');
      sendResponse({ success: false, error: 'A game is currently active!' });
    } else if (!message.data.username) {
      // on init popup, do not do anything
      console.log('active || !username');
      sendResponse({ success: false, error: 'Username cannot be empty!' });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          console.log('success kok == 0');
          tabId = tabs[0].id;
          init(
            message.data.username,
            message.data.roomId,
            message.data.lang || 'en',
            (initData) => {
              sendResponse({ success: true });
              sendMessage('init', initData);
            }
          );
        } else {
          console.log('tabs.length == 0');
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
      // inform old tab that we are changing tab
      sendMessage('change_tab', null, () => {
        // set tabId
        tabId = sender.tab.id;
        sendResponse({
          roomId: data.roomId,
          lastArticle:
            data.state === 'playing' && data.currentState.path.slice(-1)[0],
        });
      });
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
          chrome.tabs.sendMessage(parseInt(portTabId, 10), { type: 'leave' });
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

chrome.runtime.onInstalled.addListener((installObject) => {
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

  console.log(installObject);
  reset(() => {
    chrome.tabs.create(
      { url: 'https://en.wikipedia.org/wiki/Wikiracing?welcome=true' },
      () => {
        console.log('Welcome tab launched');
      }
    );
  });
});
