console.log('content_script is running!');

// wait for readyState === 'complete'
// to ensure that page finishes loading and redirects are completed
var documentReadyInterval = setInterval(function () {
  if (document.readyState === 'complete') {
    clearInterval(documentReadyInterval);
    init();
  }
}, 10);

function getLink(article) {
  return "https://en.wikipedia.org/wiki/" + encodeURIComponent(article);
}

function goto(article) {
  window.location.href = getLink(article);
}

/*
  state: lobby[.set_start|.set_target] | in_game[.idle|.clicking|.finished]
  game_context: {
    start: start article,
    target: target article,
    start_timestamp: timestamp,
    path: [article1, article2, ...],
    finished: true,
    time_taken: 10
  }
  rules: {
    time_limit: 120,
    metrics: clicks,
    allow_ctrlf: true,
    allow_disambiguation: true,
  }
*/

const defaultRules = {
  time_limit: 120,
  metrics: 'clicks',
  allow_ctrlf: true,
  allow_disambiguation: true,
  banned_articles: [],
};

let currentArticle;

function init() {
  currentArticle = decodeURIComponent(window.location.pathname.substr(window.location.pathname.lastIndexOf('/')+1));
  console.log('currentArticle:', currentArticle);

  chrome.storage.local.get(['state', 'game_context', 'rules', 'game_history'], function (result) {
    const state = result.state;
    const gameContext = result.game_context || {};
    const gameHistory = result.game_history || [];
    const rules = result.rules;
    console.log('state:', state);
    console.log('gameContext:', gameContext);

    if (!state) {
      return chrome.storage.local.set({
        state: 'lobby',
        rules: defaultRules
      }, function() {
        loadLobby(gameContext, defaultRules, gameHistory);
      });
    }
    if (state.startsWith('lobby')) {
      // on set_start and set_target
      if (state === 'lobby.set_start' || state === 'lobby.set_target') {
        if (state === 'lobby.set_start') {
          gameContext.start = currentArticle;
        } else {
          gameContext.target = currentArticle;
        }
        return chrome.storage.local.set({
          game_context: gameContext,
          state: 'lobby'
        }, function () {
          loadLobby(gameContext, rules, gameHistory);
        });
      }

      loadLobby(gameContext, rules, gameHistory);
    }
    if (state.startsWith('in_game')) {
      let lastArticle = ((gameContext.path || []).slice(-1)[0] || '').split('#')[0];

      // Check if we are in a banned list
      if (rules.banned_articles.includes(currentArticle)){
        alert('Oops, sorry, you can not go here! ;)');
        goto(lastArticle);
        return;
      }


      if (state === 'in_game.clicking') {
        // path.push logic should be here, to resolve article name conflicts in redirects
        gameContext.path.push(currentArticle);

        // check winning condition
        if (currentArticle === gameContext.target) {
          gameContext.finished = true;
          gameContext.time_taken = Math.floor(new Date().getTime() / 1000 - gameContext.start_timestamp);
          gameHistory.push(gameContext);
          let newGameContext = {
            start: gameContext.start,
            target: gameContext.target,
          };
          chrome.storage.local.set({
            state: 'lobby',
            game_context: newGameContext,
            game_history: gameHistory
          }, function() {
            alert('Congratulations! You won!');
            loadLobby(newGameContext, rules, gameHistory);
          });
          return;
        }

        chrome.storage.local.set({
          state: 'in_game.idle',
          game_context: gameContext,
        }, function () {
          loadGame(gameContext, rules, gameHistory);
        });
      }
      // handle reloads as well as force address rewrite
      else if (lastArticle === currentArticle) {
        loadGame(gameContext, rules, gameHistory);
      }
      // we're at an invalid state. reload last article in path
      else {
        goto(lastArticle);
      }
    }
  });
}

function loadLobby(gameContext, rules, gameHistory) {
  console.log('loadLobby!');

  console.log('gameContext:', gameContext);
  console.log('rules:', rules);

  let widgets = [gameWidget(false), rulesWidget(rules)];
  if (gameHistory.length) {
    widgets.push(lastRoundWidget(gameHistory.slice(-1)[0]));
  }
  replaceSidebar(widgets);

  // Start/Target Articles
  let elArticleStart = document.getElementById("wikigame-article-start");
  let elArticleTarget = document.getElementById("wikigame-article-target");

  // TODO: validation
  // On multiplayer, move the validation to server side
  if (gameContext.start) {
    elArticleStart.value = gameContext.start;
  }
  if (gameContext.target) {
    elArticleTarget.value = gameContext.target;
  }
  elArticleStart.onchange = function(e) {
    console.log('start article changed:', e.target.value);
    gameContext.start = e.target.value;
    chrome.storage.local.set({game_context: gameContext});
  }
  elArticleTarget.onchange = function(e) {
    console.log('target article changed:', e.target.value);
    gameContext.target = e.target.value;
    chrome.storage.local.set({game_context: gameContext});
  }
  document.getElementById("wikigame-article-start-random").onclick = function (e) {
    e.preventDefault();
    chrome.storage.local.set({
      state: 'lobby.set_start'
    }, function () {
      goto("Special:Random");
    });
  };
  document.getElementById("wikigame-article-target-random").onclick = function (e) {
    e.preventDefault();
    chrome.storage.local.set({
      state: 'lobby.set_target'
    }, function () {
      goto("Special:Random");
    });
  };
  document.getElementById("wikigame-article-start-current").onclick = function (e) {
    e.preventDefault();
    console.log('start article changed:', currentArticle);
    gameContext.start = currentArticle;
    elArticleStart.value = currentArticle;
    chrome.storage.local.set({game_context: gameContext});
  };
  document.getElementById("wikigame-article-target-current").onclick = function (e) {
    e.preventDefault();
    console.log('target article changed:', currentArticle);
    gameContext.target = currentArticle;
    elArticleTarget.value = currentArticle;
    chrome.storage.local.set({game_context: gameContext});
  };

  // Start!
  let elStart = document.getElementById("wikigame-start");
  elStart.onclick = function(e) {
    e.preventDefault();
    if (!gameContext.start || !gameContext.target) {
      return alert('Start and Target article must not be empty!');
    }
    chrome.storage.local.set({
      game_context: Object.assign({}, gameContext, {
        start_timestamp: Math.floor(new Date().getTime() / 1000),
        path: [gameContext.start],
      }),
      state: 'in_game.idle'
    }, function() {
      goto(gameContext.start);
    });
  };

  // Rules
  document.getElementById("wikigame-time-limit").onchange = function (e) {
    console.log('time limit changed:', e.target.value);
    rules.time_limit = parseInt(e.target.value);
    chrome.storage.local.set({rules: rules});
  };
  document.getElementById("wikigame-rules-allow-ctrlf").onchange = function (e) {
    console.log('ctrlf changed:', e.target.checked);
    rules.allow_ctrlf = e.target.checked;
    chrome.storage.local.set({rules: rules});
  };
  document.getElementById("wikigame-rules-allow-disambiguation").onchange = function (e) {
    console.log('disambiguation changed:', e.target.checked);
    rules.allow_disambiguation = e.target.checked;
    chrome.storage.local.set({rules: rules});
  };

  // Rules - Banned related
  document.getElementById("wikigame-banned-list").onclick = listBannedArticles(rules);

  document.getElementById("wikigame-banned-add").onclick = function (e) {
    console.log('add banned article clicked!');
    let addedEntry = document.getElementById("wikigame-banned-article-entry").value;
    console.log('added entry: ', addedEntry);

    if (addedEntry.length == 0){
      return;
    }

    // Make sure it's unique
    if (!rules.banned_articles.includes(addedEntry)){
      rules.banned_articles.push(addedEntry);
    }
    console.log('rules.banned_articles: ', rules.banned_articles);
    chrome.storage.local.set({rules: rules});

    let message = "Article's added. Banned articles: \n";
    message += rules.banned_articles.join('\n');
    alert(message);
  }

  document.getElementById("wikigame-banned-clear").onclick = function (e) {
    console.log('clear banned article clicked!');
    let confirmMessage = 'Are you sure to clear all banned articles?\n';
    confirmMessage += rules.banned_articles.join('\n');
    cleared = confirm(confirmMessage);
    
    if (cleared) {
      rules.banned_articles = [];
      chrome.storage.local.set({rules: rules});
    }
  }

  document.getElementById("wikigame-reset-sidebar").onclick = reset;
}

function loadGame(gameContext, rules, gameHistory) {
  console.log('loadGame!');

  console.log('gameContext:', gameContext);
  console.log('rules:', rules);

  replaceSidebar([gameWidget(true), pathWidget(gameContext.path, `Current Path (${gameContext.path.length-1} click${gameContext.path.length > 2 ? 's' : ''})`), rulesWidget(rules, true)]);

  let elArticleStart = document.getElementById("wikigame-article-start");
  let elArticleTarget = document.getElementById("wikigame-article-target");
  let elStart = document.getElementById("wikigame-start");

  elArticleStart.value = elArticleStart.title = gameContext.start;
  elArticleTarget.value = elArticleTarget.title = gameContext.target;

  let ticker = setInterval(function () {
    let elapsed = Math.floor(new Date().getTime() / 1000 - gameContext.start_timestamp);
    let left = rules.time_limit - elapsed;
    let formatted = `${Math.floor(left/60)}:${("00"+(left%60)).slice(-2)}`;
    elStart.innerHTML = formatted;

    if (left <= 0) {
      clearInterval(ticker);
      alert("Time's up!");
      gameHistory.push(gameContext);
      chrome.storage.local.set({
        state: 'lobby',
        game_context: {
          start: gameContext.start,
          target: gameContext.target,
        },
        game_history: gameHistory
      }, function() {
        location.reload();
      });
    }
  }, 100); // 100ms interval for more precision (?)

  let links = document.getElementsByTagName('a');
  for (let i = 0; i < links.length; i++) {
    links[i].onclick = function (target) {
      return function(e) {
        let link = target.href;
        console.log('Clicking:', link);

        // anchor links
        if (link.startsWith('#') || (link.startsWith(window.location.protocol + '//' + window.location.hostname + window.location.pathname + '#'))) {
          console.log('Anchor link, doesnt count as a click:', link);
          return;
        }

        e.preventDefault();
        // non-wiki links
        if (!link.startsWith('https://en.wikipedia.org/wiki/')) {
          console.log('Ignoring invalid links:', link);
          return;
        }

        // special links
        if (link.startsWith('https://en.wikipedia.org/wiki/Special:')
          || link.startsWith('https://en.wikipedia.org/wiki/Help:')
          || link.startsWith('https://en.wikipedia.org/wiki/Wikipedia:')
          || link.startsWith('https://en.wikipedia.org/wiki/Talk:')
          || link.startsWith('https://en.wikipedia.org/wiki/Main_Page')) {
          console.log('Ignoring special links:', link);
          return;
        }

        let article = decodeURIComponent(link.split('https://en.wikipedia.org/wiki/')[1]);
        console.log('Navigating to:', article);
        chrome.storage.local.set({
          state: 'in_game.clicking',
        }, function () {
          goto(article);
        });
      };
    }(links[i]);
  }

  // apply rules
  // ctrlf
  if (typeof rules.allow_ctrlf === 'boolean' && !rules.allow_ctrlf) {
    window.addEventListener('keydown',function (e) {
      if (e.keyCode === 114 || (e.ctrlKey && e.keyCode === 70)) { 
        e.preventDefault();
        alert('Oops, Ctrl+F is not allowed!');
      }
    });
  }
  // disambiguation links
  if (typeof rules.allow_disambiguation === 'boolean' && !rules.allow_disambiguation) {
    let disambiguationLinks = document.querySelectorAll('.mw-disambig');
    for (let i = 0; i < disambiguationLinks.length; i++) {
      disambiguationLinks[i].onclick = function (e) {
        e.preventDefault();
        alert('Oops, Disambiguation pages are not allowed!');
      };
    }
  }

  document.getElementById("wikigame-reset-sidebar").onclick = reset;
  document.getElementById("wikigame-banned-list").onclick = listBannedArticles(rules);
}

let sidebar = document.getElementById("mw-panel");
let sidebarOriginalInnerHTML = sidebar.innerHTML;

// Defined here since it should be clickable when in game or lobby
function listBannedArticles(rules) {
  return function(e){
    console.log('list banned articles clicked!');
    if (rules.banned_articles.length == 0) {
      alert('No worries, no banned articles!');
      return;
    }
    bannedMessage = 'You can not click/go to these links:\n';
    bannedMessage += rules.banned_articles.join('\n');
    alert(bannedMessage);
    return;
  };
}

function replaceSidebar(widgets) {
  sidebar.innerHTML = `
    <style>
      #wikigame-wrapper input[type=text], #wikigame-wrapper input[type=number] {
        width: 100%;
        box-sizing: border-box;
      }

      button#wikigame-start, button#wikigame-banned-list, button#wikigame-banned-add, button#wikigame-banned-clear {
        box-sizing: border-box;
        background-color: black;
        color: white;
      }

      button#wikigame-start {
        width: 100%;
      }

      button#wikigame-banned-list, button#wikigame-banned-add, button#wikigame-banned-clear {
        width: 30%;
        font-size: 0.6em;
      }

      button#wikigame-banned-list {
        background-color: green;
      }

      #wikigame-wrapper label, #wikigame-wrapper .a {
        font-size: 0.75em;
      }
    </style>
    <div id="p-logo" role="banner">
      <a title="Visit the main page" class="mw-wiki-logo" href="/wiki/Main_Page"></a>
    </div>
    <div id="wikigame-wrapper">
      <nav class="vector-menu vector-menu-portal portal">
        <h3>
          <span>Welcome to Wikigame!</span>
        </h3>
      </nav>
      ${widgets.join('\n')}
    </div>
  `;
};

function bannedWidget(rules, disabled){
  return `
    <h3>
      <span>Ban Articles</span>
    </h3>
    <div class="body vector-menu-content">
      ${
        disabled ? 
        `<ul>
          ${rules.banned_articles.map(function (a){
            return `<li>${a}</li>`;
          }).join('\n')}
        </ul>` 
        :
        ` 
        <label for="wikigame-banned-article-entry">Article</label>
        <input type="text" id="wikigame-banned-article-entry" placeholder="Article">
        <span>
          <button id="wikigame-banned-add">Add</button>
          <button id="wikigame-banned-list">List</button>
          <button id="wikigame-banned-clear">Clear</button>
        </span>
        `
      }
    </div>
  `
}

function rulesWidget(rules, disabled) {
  return `
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
        <span>Options</span>
      </h3>
      <div class="body vector-menu-content">
        <label>Time Limit</label>
        <input type="number" min="1" increment="1" id="wikigame-time-limit" value="${rules.time_limit}" ${disabled ? 'disabled' : ''}/>
        <label>Additional Rules</label>
        <br/>
        <input type="checkbox" id="wikigame-rules-allow-ctrlf" value="true" ${rules.allow_ctrlf ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
        <label for="wikigame-rules-allow-ctrlf">Allow Ctrl+F</label>
        <br/>
        <input type="checkbox" id="wikigame-rules-allow-disambiguation" value="true" ${rules.allow_disambiguation ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
        <label for="wikigame-rules-allow-disambiguation">Allow Disambiguation Page</label>
      </div>
      ${bannedWidget(rules, disabled)}
    </nav>
  `;
};
function gameWidget(disabled) {
  return `
    <nav class="vector-menu vector-menu-portal portal">
      <div class="body vector-menu-content">
        <div style="padding-bottom:10px">
          <label>Start Article</label>
          <input type="text" placeholder="Start Article" id="wikigame-article-start" ${disabled ? 'disabled' : ''}/>
          ${disabled ? '' : `
            <a class="a" href="#" id="wikigame-article-start-current">current</a>
            |
            <a class="a" href="#" id="wikigame-article-start-random">random</a>
          `}
          </div>
          <div style="padding-bottom:10px">
          <label>Target Article</label>
          <input type="text" placeholder="Target Article" id="wikigame-article-target" ${disabled ? 'disabled' : ''}/>
          ${disabled ? '' : `
            <a class="a" href="#" id="wikigame-article-target-current">current</a>
            |
            <a class="a" href="#" id="wikigame-article-target-random">random</a>
          `}
        </div>
        <button id="wikigame-start" ${disabled ? 'disabled' : ''}>Start</button>
        <ul>
          <li>
            <a id="wikigame-reset-sidebar" href="#">Reset</a>
          </li>
        </ul>
      </div>
    </nav>
  `;
};
function pathWidget(path, title = 'Path') {
  return `
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
        <span>${title}</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          ${path.map(function (a) {
            return `<li>${a}</li>`;
          }).join('\n')}
        </ul>
      </div>
    </nav>
  `;
};
function lastRoundWidget(gameContext) {
  return `
    <nav class="vector-menu vector-menu-portal portal">
      <h3>
        <span>Last Round</span>
      </h3>
      <div class="body vector-menu-content">
        <ul>
          <li>
            <b>
              <a href="${getLink(gameContext.start)}">${gameContext.start}</a>
              to
              <a href="${getLink(gameContext.target)}">${gameContext.target}</a>
            </b>
          </li>
        ${gameContext.finished ? `
          <li>Time taken: ${gameContext.time_taken} seconds</li>
          <li>Clicks: ${gameContext.path.length - 1}</li>
        ` : `
          <li>Not finished</li>
        `}
        </ul>
      </div>
      <div class="body vector-menu-content">
        <ul>
          <li><b>Path</b></li>
          ${gameContext.path.map(function (a) {
            return `<li><a href="${getLink(a)}">${a}</a></li>`;
          }).join('\n')}
        </ul>
      </div>
      <div class="body vector-menu-content">
      <ul>
          <li><b>Solution</b></li>
          <li><a target="_blank" href="https://www.sixdegreesofwikipedia.com/?source=${encodeURIComponent(gameContext.start)}&target=${encodeURIComponent(gameContext.target)}">Six Degree of Wikipedia</a></li>
        </ul>
      </div>
    </nav>
  `;
};

function reset(e) {
  if (e && e.preventDefault) e.preventDefault();

  chrome.storage.local.set({
    state: 'lobby',
    rules: defaultRules,
    game_context: {},
    game_history: [],
  }, function() {
    goto(currentArticle);
  });
}
