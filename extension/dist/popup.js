document.getElementById("startButton").addEventListener("click",(function(){var e={roomId:document.getElementById("roomId").value,username:document.getElementById("username").value};if(""!=e.username){let t={type:"set_room_id",data:e};chrome.runtime.sendMessage(t,(function(){window.close()}))}}));