console.log('content_script is running!');

// wait for readyState === 'complete'
// to ensure that page finishes loading and redirects are completed
const documentReadyInterval = setInterval(() => {
  if (document.readyState === 'complete') {
    clearInterval(documentReadyInterval);
    init();
  }
}, 10);

function getLink(article) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(article)}`;
}

function getArticleFromUrl(link) {
  const url = new URL(link);
  if (url.hostname !== 'en.wikipedia.org') {
    return {};
  }
  if (url.pathname.startsWith('/wiki')) {
    return {
      article: decodeURIComponent(url.pathname.substr(url.pathname.lastIndexOf('/') + 1)),
      hash: url.hash,
    };
  }
  if (url.pathname.startsWith('/w/index.php')) {
    return {
      article: url.searchParams.get('title'),
      hash: url.hash,
    };
  }
  return {};
}

function goto(article) {
  const url = new URL(getLink(article));

  // preserve roomId
  const currentUrl = new URL(window.location.href);
  const roomId = currentUrl.searchParams.get('roomId');
  if (roomId) {
    url.searchParams.set('roomId', roomId);
  }

  window.location.href = url.href;
}

let currentArticle;
let sidebar;

function getCurrentArticle() {
  return getArticleFromUrl(window.location.href).article;
}

// listens to update
chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    console.log('got message from background:', message);
    if (message.type === 'update') {
      // currently we repaint the whole thing.
      // TODO: find more efficient way to update
      loadUI(message.data);
    } else if (message.type === 'start') {
      goto(message.data.currentRound.start);
    } else if (message.type === 'finished') {
      alert('Round is finished!');
      loadUI(message.data);
    } else if (message.type === 'username_prompt') {
      const username = window.prompt('Enter your username:');
      sendResponse({ username });
      return true;
    } else if (message.type === 'room_change_prompt') {
      const confirmMessage = `You are currently playing in room ${message.data.old}. You sure you want to join room ${message.data.new}? (You will be removed from the old room)`;
      sendResponse({ confirm: window.confirm(confirmMessage) });
      return true;
    } else if (message.type === 'disconnected') {
      alert('You are disconnected! Refresh this page to reconnect');
    } else {
      console.warn('unknown message type:', message.type);
    }
    sendResponse(null);
    return false;
  },
);

function init() {
  sidebar = document.getElementById('mw-panel');

  currentArticle = getCurrentArticle();
  console.log('currentArticle:', currentArticle);

  chrome.runtime.sendMessage({
    type: 'init',
    roomId: new URLSearchParams(window.location.search).get('roomId'),
  }, (data) => {
    console.log('init data:', data);

    if (!data || !data.roomId) return;

    if (data.error) {
      alert(`Encountered error: ${data.error}`);
      return;
    }

    // this (supposedly) resolves inactive background page
    const pingInterval = setInterval(() => {
      chrome.runtime.sendMessage({ type: 'ping' }, (reply) => {
        if (!reply || !reply.status) {
          clearInterval(pingInterval);
          alert('You are disconnected! Refresh this page to reconnect');
          // TODO: apply visual hint other than alert to indicate disconnection
        }
      });
    }, 1000);

    // append roomId on the URL
    const url = new URL(window.location.href);
    url.searchParams.set('roomId', data.roomId);
    window.history.pushState({}, document.title, url.pathname + url.search);

    // handle local states like click, setStartArticle, setTargetArticle, setBannedArticle
    if (data.state === 'playing' && !data.currentState.finished) {
      const lastArticle = data.currentState.path.slice(-1)[0] || data.currentRound.start;

      if (data.localState === 'clicking') {
        chrome.runtime.sendMessage({
          type: 'click',
          data: { article: currentArticle },
        }, (reply) => {
          chrome.storage.local.set({ localState: null }, () => {
            if (!reply || !reply.valid) {
              if (reply.message) alert(reply.message);
              goto(lastArticle);
            } else {
              if (reply.currentState.finished) {
                alert(`You reached the target! Your score is ${reply.currentState.score}`);
              }
              loadGame({ ...data, currentState: reply.currentState });
            }
          });
        });
      } else if (lastArticle !== currentArticle) {
        // prevent infinite loop by introducing invalid state
        if (data.localState === 'invalid') {
          console.error('We\'re in invalid state! Will stay on this article to prevent infinite redirects');
          chrome.storage.local.set({ localState: null }, () => {
            loadGame(data);
          });
        } else {
          chrome.storage.local.set({ localState: 'invalid' }, () => {
            goto(lastArticle);
          });
        }
      } else {
        // when we're on this state, possibly due to reloads
        loadGame(data);
      }
    // handle set with current article
    } else if (data.state === 'lobby' && (data.localState === 'setStartArticle' || data.localState === 'setTargetArticle')) {
      loadLobby(data);
      const { localState } = data;
      chrome.storage.local.set({ localState: null }, () => {
        chrome.runtime.sendMessage({
          type: 'update',
          data: { currentRound: { [localState === 'setStartArticle' ? 'start' : 'target']: currentArticle } },
        });
      });
    } else {
      loadUI(data);
    }
  });
}

function loadUI(data) {
  console.log('loadUI called with data:', data);

  if (data.state === 'lobby') {
    loadLobby(data);
  } else if (data.state === 'playing') {
    loadGame(data);
  } else {
    console.error('loadUI called with unknown state:', data.state);
  }
}

function loadLobby(data) {
  console.log('loadLobby called with data:', data);

  const { currentRound } = data;
  const { rules } = data;
  const { leaderboard } = data;
  const { lastRound } = data;

  const isHost = data.host === data.username;

  const widgets = [];
  if (leaderboard && leaderboard.length) {
    widgets.push(leaderboardWidget(leaderboard, data.host, data.username));
  }
  widgets.push(currentRoundWidget(currentRound, rules, !isHost));
  if (lastRound) {
    widgets.push(lastRoundWidget(lastRound));
  }
  replaceSidebar(widgets, data.username);

  // Start/Target Articles
  const elArticleStart = document.getElementById('wikigame-article-start');
  const elArticleTarget = document.getElementById('wikigame-article-target');

  if (currentRound.start) {
    elArticleStart.value = currentRound.start;
  }
  if (currentRound.target) {
    elArticleTarget.value = currentRound.target;
  }

  // when we're not the host, nothing below this is editable, so we return here
  if (!isHost) return;

  elArticleStart.onchange = function (e) {
    console.log('start article changed:', e.target.value);
    chrome.runtime.sendMessage({
      type: 'update',
      data: { currentRound: { start: e.target.value } },
    });
  };
  elArticleTarget.onchange = function (e) {
    console.log('target article changed:', e.target.value);
    chrome.runtime.sendMessage({
      type: 'update',
      data: { currentRound: { target: e.target.value } },
    });
  };
  document.getElementById('wikigame-article-start-random').onclick = function (e) {
    e.preventDefault();
    chrome.storage.local.set({
      localState: 'setStartArticle',
    }, () => {
      goto('Special:Random');
    });
  };
  document.getElementById('wikigame-article-target-random').onclick = function (e) {
    e.preventDefault();
    chrome.storage.local.set({
      localState: 'setTargetArticle',
    }, () => {
      goto('Special:Random');
    });
  };
  document.getElementById('wikigame-article-start-current').onclick = function (e) {
    e.preventDefault();
    console.log('start article changed:', currentArticle);
    chrome.runtime.sendMessage({
      type: 'update',
      data: { currentRound: { start: currentArticle } },
    });
  };
  document.getElementById('wikigame-article-target-current').onclick = function (e) {
    e.preventDefault();
    console.log('target article changed:', currentArticle);
    chrome.runtime.sendMessage({
      type: 'update',
      data: { currentRound: { target: currentArticle } },
    });
  };

  // Start!
  const elStart = document.getElementById('wikigame-start');
  elStart.onclick = function (e) {
    e.preventDefault();
    if (!currentRound.start || !currentRound.target) {
      alert('Start and Target article must not be empty!');
      return;
    }
    chrome.runtime.sendMessage({ type: 'start' });
  };

  // Rules
  document.getElementById('wikigame-time-limit').onchange = function (e) {
    console.log('time limit changed:', e.target.value);
    chrome.runtime.sendMessage({
      type: 'update',
      data: { rules: { timeLimit: parseInt(e.target.value, 10) } },
    });
  };
  const elMetrics = document.getElementById('wikigame-metrics');
  elMetrics.onchange = function () {
    console.log('metrics changed:', elMetrics.value);
    chrome.runtime.sendMessage({
      type: 'update',
      data: { rules: { metrics: elMetrics.value } },
    });
  };
  document.getElementById('wikigame-rules-allow-ctrlf').onchange = function (e) {
    console.log('ctrlf changed:', e.target.checked);
    chrome.runtime.sendMessage({
      type: 'update',
      data: { rules: { allowCtrlf: e.target.checked } },
    });
  };
  document.getElementById('wikigame-rules-allow-disambiguation').onchange = function (e) {
    console.log('disambiguation changed:', e.target.checked);
    chrome.runtime.sendMessage({
      type: 'update',
      data: { rules: { allowDisambiguation: e.target.checked } },
    });
  };

  // Rules - Banned related
  const elBannedArticleInput = document.getElementById('wikigame-banned-article-entry');
  document.getElementById('wikigame-banned-add').onclick = function () {
    console.log('add banned article clicked!');
    const addedEntry = elBannedArticleInput.value;
    console.log('added entry: ', addedEntry);

    if (addedEntry.length === 0) {
      return;
    }

    // Make sure it's unique
    if (!rules.bannedArticles.includes(addedEntry)) {
      rules.bannedArticles.push(addedEntry);

      console.log('rules.bannedArticles:', rules.bannedArticles);
      elBannedArticleInput.value = '';
      chrome.runtime.sendMessage({
        type: 'update',
        data: { rules: { bannedArticles: rules.bannedArticles } },
      });
    }
  };

  document.getElementById('wikigame-banned-current').onclick = function () {
    if (!rules.bannedArticles.includes(currentArticle)) {
      rules.bannedArticles.push(currentArticle);
      chrome.runtime.sendMessage({
        type: 'update',
        data: { rules: { bannedArticles: rules.bannedArticles } },
      });
    }
  };

  document.getElementById('wikigame-banned-clear').onclick = function () {
    console.log('clear banned article clicked!');
    let confirmMessage = 'Are you sure to clear all banned articles?\n';
    confirmMessage += rules.bannedArticles.join('\n');
    cleared = window.confirm(confirmMessage);

    if (cleared) {
      rules.bannedArticles = [];
      chrome.runtime.sendMessage({
        type: 'update',
        data: { rules: { bannedArticles: rules.bannedArticles } },
      });
    }
  };
}

function loadGame(data) {
  console.log('loadGame called with data:', data);

  const { currentState } = data;
  const { currentRound } = data;
  const { rules } = data;

  const widgets = [
    currentRoundWidget(currentRound, rules, true),
    pathWidget(currentState.path),
  ];

  // hacks around repainting
  // TODO: remove this when better update mechanism is implemented
  const ref = `${new Date().getTime()}`;
  widgets.push(`<div id="${ref}" style="display:none"></div>`);
  const refActive = function () {
    const res = document.getElementById(ref);
    console.log('refActive:', res);
    return res;
  };

  replaceSidebar(widgets, data.username);

  if (!data.currentState.finished) {
    const links = document.getElementsByTagName('a');
    for (let i = 0; i < links.length; i++) {
      links[i].onclick = (function (target) {
        return function (e) {
          const link = target.href;
          console.log('Clicking:', link);

          const articleObj = getArticleFromUrl(link);
          const { article } = articleObj;

          // anchor links
          if (article === currentArticle) {
            console.log('Anchor link, doesnt count as a click:', link);
            return;
          }

          e.preventDefault();

          // non-wiki links
          if (!article) {
            console.log('Ignoring invalid links:', link);
            return;
          }

          // special links
          if (article.startsWith('Special:')
            || article.startsWith('Help:')
            || article.startsWith('Wikipedia:')
            || article.startsWith('Talk:')
            || article.startsWith('Main_Page')
            || article.startsWith('File:')) {
            console.log('Ignoring special links:', link);
            return;
          }

          console.log('Navigating to:', article);
          chrome.storage.local.set({
            localState: 'clicking',
          }, () => {
            goto(article);
          });
        };
      }(links[i]));
    }
  }

  // apply rules
  // ctrlf
  if (typeof rules.allowCtrlf === 'boolean' && !rules.allowCtrlf) {
    window.addEventListener('keydown', (e) => {
      if (!refActive()) return;

      if (e.keyCode === 114 || (e.ctrlKey && e.keyCode === 70)) {
        e.preventDefault();
        alert('Oops, Ctrl+F is not allowed!');
      }
    });
  }
  // disambiguation links
  if (typeof rules.allowDisambiguation === 'boolean' && !rules.allowDisambiguation) {
    const disambiguationLinks = document.querySelectorAll('.mw-disambig');
    for (let i = 0; i < disambiguationLinks.length; i++) {
      disambiguationLinks[i].onclick = function (e) {
        e.preventDefault();
        alert('Oops, Disambiguation pages are not allowed!');
      };
    }
  }
}

function replaceSidebar(widgets, username) {
  sidebar.innerHTML = `
    <style>
      #wikigame-wrapper input[type=text], #wikigame-wrapper input[type=number], #wikigame-wrapper select {
        width: 100%;
        box-sizing: border-box;
      }

      button#wikigame-start, button#wikigame-banned-current, button#wikigame-banned-add, button#wikigame-banned-clear, button#wikigame-countdown {
        box-sizing: border-box;
        background-color: black;
        color: white;
      }

      button#wikigame-countdown.red {
        background-color: red;
      }

      button#wikigame-start, button#wikigame-countdown {
        width: 100%;
      }

      button#wikigame-banned-add, button#wikigame-banned-current, button#wikigame-banned-clear {
        font-size: 0.6em;
      }
      button#wikigame-banned-add {
        width: 25%;
      }
      button#wikigame-banned-current {
        width: 35%;
      }
      button#wikigame-banned-clear {
        width: 30%;
        background-color: #b32424;
      }

      #wikigame-wrapper label, #wikigame-wrapper .a {
        font-size: 0.75em;
      }
    </style>
    <!--div id="p-logo" role="banner">
      <a title="Visit the main page" class="mw-wiki-logo" href="/wiki/Main_Page"></a>
    </div-->
    <div id="wikigame-wrapper">
      <nav class="vector-menu vector-menu-portal portal">
        <h3 style="font-size:1em">
          ${username
    ? `<span>Welcome to Wikigame, <b>${username}</b>!</span>`
    : '<span>Welcome to Wikigame!</span>'
}
        </h3>
      </nav>
      ${widgets.join('\n')}
    </div>
  `;
}

function bannedArticlesWidget(rules, disabled) {
  return `
    <h3>
      <span>Banned Articles</span>
    </h3>
    <div class="body vector-menu-content">
      <ul>
        ${rules.bannedArticles.map((a) => `<li>${a}</li>`).join('\n')}
      </ul> 
      ${
  disabled ? ''
    : `
          <input type="text" id="wikigame-banned-article-entry" placeholder="Add Banned Article">
          <span>
            <button id="wikigame-banned-add">Add</button>
            <button id="wikigame-banned-current">Current</button>
            <button id="wikigame-banned-clear">Clear</button>
          </span>
        `
}
    </div>
  `;
}

function currentRoundArticlePickerWidget(currentRound, disabled) {
  return `
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
        <span>Next Round</span>
      </h3>
      <div class="body vector-menu-content">
        <div style="padding-bottom:10px">
          <label>Start Article</label>
          <input type="text" placeholder="Start Article" id="wikigame-article-start" ${disabled ? 'disabled' : ''} value="${currentRound.start}"/>
          ${disabled ? '' : `
            <a class="a" href="#" id="wikigame-article-start-current">current</a>
            |
            <a class="a" href="#" id="wikigame-article-start-random">random</a>
          `}
          </div>
          <div style="padding-bottom:10px">
          <label>Target Article</label>
          <input type="text" placeholder="Target Article" id="wikigame-article-target" ${disabled ? 'disabled' : ''} value="${currentRound.target}"/>
          ${disabled ? '' : `
            <a class="a" href="#" id="wikigame-article-target-current">current</a>
            |
            <a class="a" href="#" id="wikigame-article-target-random">random</a>
          `}
        </div>
        ${disabled ? '' : '<button id="wikigame-start">Start</button>'}
      </div>
    </nav>
  `;
}

function rulesWidget(rules, disabled) {
  return `
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
        <span>Options</span>
      </h3>
      <div class="body vector-menu-content">
        <label>Time Limit</label>
        <input type="number" min="1" increment="1" id="wikigame-time-limit" value="${rules.timeLimit}" ${disabled ? 'disabled' : ''}/>
        <label>Scoring Metrics</label>
        <select id="wikigame-metrics" style="text-transform:capitalize" ${disabled ? 'disabled' : ''}>
          ${['clicks', 'time', 'combined'].map((metrics) => `<option value="${metrics}" ${metrics === rules.metrics ? 'selected' : ''}>
              ${metrics}
            </option>`)}
        </select>
        <label>Additional Rules</label>
        <br/>
        <input type="checkbox" id="wikigame-rules-allow-ctrlf" value="true" ${rules.allowCtrlf ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
        <label for="wikigame-rules-allow-ctrlf">Allow Ctrl+F</label>
        <br/>
        <input type="checkbox" id="wikigame-rules-allow-disambiguation" value="true" ${rules.allowDisambiguation ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
        <label for="wikigame-rules-allow-disambiguation">Allow Disambiguation Page</label>
      </div>
      ${bannedArticlesWidget(rules, disabled)}
    </nav>
  `;
}

function currentRoundWidget(currentRound, rules, disabled) {
  return `
    ${
  currentRound.started
    ? currentRoundStatusWidget(currentRound)
    : currentRoundArticlePickerWidget(currentRound, disabled)
}
    ${rulesWidget(rules, disabled)}
  `;
}

function pathWidget(path, title) {
  return `
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
        <span>${title || `Current Path (${path.length - 1} click${path.length > 2 ? 's' : ''})`}</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          ${path.map((a) => `<li>${a}</li>`).join('\n')}
        </ul>
      </div>
    </nav>
  `;
}

function leaderboardWidget(leaderboard, host, username) {
  return `
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
        <span>Leaderboard</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          ${leaderboard.map((result, index) => `<li>
              ${index + 1}. ${username === result.username
  ? `<b>${result.username} (${result.score})</b>`
  : `${result.username} (${result.score})`
}
              ${host === result.username ? '<span title="host">👑</span>' : ''}
            </li>`).join('\n')}
        </ul>
      </div>
    </nav>
  `;
}

function lastRoundWidget(lastRound) {
  return `
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
        <span>Last Round</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          <li>
            <b>
              <a href="${getLink(lastRound.start)}">${lastRound.start}</a>
              to
              <a href="${getLink(lastRound.target)}">${lastRound.target}</a>
            </b>
          </li>
        </ul>
      </div>
      <div class="body vector-menu-content">
        <ul>
          <li><b>Results</b></li>
          ${lastRound.result.map((result) => {
    const details = `${result.username} (${result.clicks} click${result.clicks > 1 ? 's' : ''}${result.finished ? `, ${result.timeTaken} seconds, score = ${result.score}` : ''}): ${result.path.join(' -> ')}`;
    return `<li>
              ${result.username}
              <a href="#" onclick='alert(${JSON.stringify(details)});return false;'>(${result.clicks} click${result.clicks > 1 ? 's' : ''})</a>
              ${result.finished ? `(score = ${result.score})` : '(not finished)'}
            </li>`;
  }).join('\n')}
        </ul>
      </div>
      <div class="body vector-menu-content">
        <ul>
          <li><b>Solution</b></li>
          <li><a target="_blank" href="https://www.sixdegreesofwikipedia.com/?source=${encodeURIComponent(lastRound.start)}&target=${encodeURIComponent(lastRound.target)}">Six Degree of Wikipedia</a></li>
        </ul>
      </div>
    </nav>
  `;
}

function currentRoundStatusWidget(currentRound) {
  return `
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
        <span>Current Round</span>
      </h3>
      <div class="body vector-menu-content">
        <div style="padding-bottom:10px">
          <label>Start Article</label><br/>
          <span style="word-break:break-all"><b>${currentRound.start}</b></span>
        </div>
        <div style="padding-bottom:10px">
          <label>Target Article</label><br/>
          <span style="word-break:break-all"><b>${currentRound.target}</b></span>
        </div>
        <button id="wikigame-countdown" disabled ${currentRound.timeLeft < 10 ? 'class="red"' : ''}>
          ${Math.floor(currentRound.timeLeft / 60)}:${(`00${currentRound.timeLeft % 60}`).slice(-2)}
        </button>
      </div>
    </nav>
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
        <span>Round leaderboard</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          ${(currentRound.result || []).map((result) => `<li>
              ${result.username}
              (${result.clicks} click${result.clicks > 1 ? 's' : ''})
              ${result.finished ? `(score = ${result.score})` : ''}
            </li>`).join('\n')}
        </ul>
      </div>
    </nav>
  `;
}
