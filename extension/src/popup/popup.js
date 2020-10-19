document.getElementById('startButton').addEventListener('click', function() {
  var roomId = document.getElementById('roomId').value;
  var username = document.getElementById('username').value;
  var data = {
    roomId,
    username,
  };
  if (data.username != '') {
    let message = { type: 'init_popup', data };
    chrome.runtime.sendMessage(message, function() {
      window.close();
    });
  }
});