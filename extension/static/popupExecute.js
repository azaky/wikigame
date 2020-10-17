if(data.roomId != '' && data.username != '') {
  
  const url = new URL(window.location.href);
  url.searchParams.set('roomId', data.roomId);
  window.history.pushState({}, document.title, url.pathname + url.search);

  let message = { type: 'set_room_id', data };
  //console.log('message: ', message);
  chrome.runtime.sendMessage(message);
}