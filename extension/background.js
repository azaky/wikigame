chrome.pageAction.onClicked.addListener(function () {
  console.log('Page action clicked!');

  // currently page action clicks serves as reset button
  // TODO: create popup page
  chrome.storage.local.set({
    state: 'lobby',
    rules: {
      time_limit: 120,
      metrics: 'clicks',
      allow_ctrlf: true,
      allow_disambiguation: true,
    },
    game_context: {},
    game_history: [],
  }, function () {
    console.log('State is reset!');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.reload(tabs[0].id);
    });
  });
});

chrome.storage.onChanged.addListener(function(changes, areaName) {
  console.log("storage change: " + JSON.stringify(changes) + " for " + JSON.stringify(areaName));
});

chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {hostEquals: 'en.wikipedia.org'},
      })],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});
