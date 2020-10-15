import io from 'socket.io-client';
import mergeDeepRight from 'ramda/src/mergeDeepRight';

const serverUrl = process.env.WIKIGAME_SERVER_URL || 'https://wikigame-multiplayer.herokuapp.com/';

let active = false;
let socket;
let tabId;
let portOpen = false;

chrome.runtime.onConnect.addListener(port => {
  console.log('received port connection:', port.name);
  if (port.name === `tabId:${tabId}`) {
    console.log('port open');
    portOpen = true;
    port.onDisconnect.addListener(() => {
      console.log('port closed');
      portOpen = false;
    });
  }
});

function reset(callback) {
  if (socket && socket.connected) {
    socket.close();
  }
  active = false;
  chrome.storage.local.set({
    username: null,
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
  }, () => {
    console.log('State is reset!');
    if (callback) callback();
  });
}

function sendMessage(type, data, callback, force) {
  if (!portOpen) {
    console.log('sendMessage is called when port is closed (possibly on reload)', type, data);
    if (force) {
      setTimeout(() => sendMessage(type, data, callback, force), 10);
    } else if (callback) callback(null);
  } else if (!tabId) {
    console.error('sendMessage is called when tabId is not defined! data:', type, data);
    if (callback) callback(null);
  } else {
    chrome.tabs.sendMessage(tabId, { type, data }, (response) => {
      console.log('sendMessage response:', response);
      if (callback) callback(response);
    });
  }
}

function sendNotification(type, message, callback) {
  sendMessage('notification', {type, message}, callback);
}

let updateDataLock = false;
function updateData(data, callback) {
  // prevent race condition
  if (!updateDataLock) {
    updateDataLock = true;
    chrome.storage.local.get(null, localData => {
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

function initSocketio(initData, callback) {
  let query = `username=${encodeURIComponent(initData.username)}`;
  if (initData.roomId) {
    query += `&roomId=${encodeURIComponent(initData.roomId)}`;
  }

  if (socket && socket.connected) {
    console.warn('initSocketio called when existing socket connection still active, will close the existing one');
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
      callback({ success: false, error: 'Failed to connect to the server' });
    }
  });

  // one time room data on init
  socket.on('init', (data) => {
    active = true;
    console.log('socket.on(init):', data);
    chrome.storage.local.set(data, () => {
      chrome.storage.local.get(null, callback);
    });
  });

  socket.on('init_error', (data) => {
    console.log('socket.on(init_error):', data);
    socket.close();
    callback({ error: data.message });
  });

  socket.on('update', (data) => {
    console.log('socket.on(update):', data);
    updateData(data, updated => {
      sendMessage('update', updated);
    });
  });

  socket.on('start', (data) => {
    console.log('socket.on(start):', data);
    updateData(data, updated => {
      sendMessage('start', updated);
    });
  });

  socket.on('finished', (data) => {
    console.log('socket.on(finished):', data);
    updateData(data, updated => {
      // finished event is critical
      // make sure that this went through
      sendMessage('finished', updated, null, true);
    });
  });

  socket.on('notification', (data) => {
    console.log('socket.on(notification):', data);
    sendNotification('notification', data.message);
  })
}

function init(username, roomId, callback) {
  reset(() => {
    if (username) {
      chrome.storage.local.set({ username }, () => {
        initSocketio({ roomId, username }, callback);
      });
    } else {
      // prompt for username
      sendMessage('username_prompt', null, (data) => {
        if (!data || !data.username) {
          callback(null);
          return;
        }
  
        chrome.storage.local.set({ username: data.username }, () => {
          initSocketio({ roomId, username: data.username }, callback);
        });
      });
    }
  });
}

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    console.log('Message from content_script (tabId =', sender.tab.id, '):', message);

    // TODO: handle cases when tabs are changed (e.g. user opens multiple wiki tabs).
    tabId = sender.tab.id;

    if (message.type === 'init') {
      if (active && socket && socket.connected) {
        chrome.storage.local.get(null, (data) => {
          // when roomId is different, kick ourself out from the old room and join the new one
          if (message.roomId && message.roomId !== data.roomId) {
            sendMessage('room_change_prompt', { old: data.roomId, new: message.roomId }, (changeRoomData) => {
              if (changeRoomData && changeRoomData.confirm) {
                active = false;
                socket.close();
                init(data.username, message.roomId, sendResponse);
              } else {
                sendResponse(null);
              }
            });
          } else {
            // a session is active: return current context
            sendResponse(data);
          }
        });
      } else {
        // if roomId is not defined, then it means that the user does not
        // intentionally start a new game. so we're ignoring that case
        if (!message.roomId) {
          sendResponse(null);
        } else {
          init(message.username, message.roomId, sendResponse);
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

    if (!active || !socket || !socket.connected) {
      console.warn('onMessage called when not active, ignoring. message:', message);

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
            updateData({}, updated => {
              sendMessage('update', updated);
              // For now, this is only for resetting loading state in ArticlePicker
              sendResponse({error: ack.message});
            });
          }
        } else if (ack.data) {
          updateData(ack.data, updated => {
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

      socket.emit('start', {}, ack => {
        if (!ack || !ack.success) {
          if (ack.message) {
            sendNotification('error', ack.message);
          }
        } else if (ack.data) {
          updateData(ack.data, updated => {
            sendMessage('start', updated);
          });
        }
      });
    } else if (message.type === 'click') {
      console.log('click!');

      socket.emit('click', message.data, (ack) => {
        // We need to reset localState *via updateData* to prevent
        // racing condition (and ultimately, deadlocks).
        const toUpdate = {localState: null};
        if (ack.data) {
          Object.assign(toUpdate, {currentState: ack.data});
        }
        updateData(toUpdate, updated => {
          // and we need to include updated data here as well
          // since update listener in content script currently
          // has not been active yet.
          sendResponse(Object.assign(ack, {updatedData: updated}));
        });
      });

      return true;
    } else {
      console.warn('onMessage unknown message.type:', message);
    }

    sendResponse(null);
    return false;
  },
);

chrome.pageAction.onClicked.addListener(() => {
  console.log('Page action clicked!');

  // currently page action clicks serves as reset button
  // TODO: create popup page
  reset(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.reload(tabs[0].id);
    });
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log(`storage change: ${JSON.stringify(changes)} for ${JSON.stringify(areaName)}`);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostEquals: 'en.wikipedia.org' },
      })],
      actions: [new chrome.declarativeContent.ShowPageAction()],
    }]);
  });
});
