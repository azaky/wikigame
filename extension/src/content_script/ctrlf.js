// prevent people from clicking ctrl+f before the page loads
// disable ctrl+f on initial load, then remove the listener when document is ready
function handleCtrlfOnInitialLoad(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
    e.preventDefault();
  }
}
window.addEventListener('keydown', handleCtrlfOnInitialLoad);
console.log('ctrlf: ctrlf injected');

const documentReadyInterval = setInterval(() => {
  if (document.readyState === 'complete') {
    clearInterval(documentReadyInterval);

    window.removeEventListener('keydown', handleCtrlfOnInitialLoad);
    console.log('ctrlf: ctrlf removed');
  }
}, 10);
