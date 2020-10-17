document.getElementById('startButton').addEventListener('click', function() {
  var roomId = document.getElementById('roomId').value;
  var username = document.getElementById('username').value;
  var data = {
    roomId,
    username
  }
  if(data.roomId != '' && data.username != '') {
    let message = { type: 'set_room_id', data };
    chrome.runtime.sendMessage(message, function() {
      window.close();
    });
  }
});