// function hello() {
//   var roomId = document.getElementById('roomId').value;
//   var username = document.getElementById('username').value;
//   var data = {
//     roomId,
//     username
//   }
//   chrome.tabs.executeScript({
//     code: "var data = JSON.parse('" + encodeToPassToContentScript(data) + "'); var username"
//   }, function () {
//       chrome.tabs.executeScript({
//           file: "popupExecute.js"
//       });
//   });
// }

// function encodeToPassToContentScript(obj){
//   // Encodes into JSON and quotes \ characters so they will not break
//   // when re-interpreted as a string literal. Failing to do so could
//   // result in the injection of arbitrary code and/or JSON.parse() failing.
//   return JSON.stringify(obj).replace(/\\/g,'\\\\').replace(/'/g,"\\'")
// }

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