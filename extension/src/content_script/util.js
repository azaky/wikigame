export function getLink(article) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(article)}`;
}

export function getRoomId() {
  return new URLSearchParams(window.location.search).get('roomId');
}

export function setRoomIdOnUrl(roomId) {
  const url = new URL(window.location.href);
  url.searchParams.set('roomId', roomId);
  window.history.pushState({}, document.title, url.pathname + url.search);
}

export function getArticleFromUrl(link) {
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

export function goto(article) {
  const url = new URL(getLink(article));

  // preserve roomId
  const currentUrl = new URL(window.location.href);
  const roomId = currentUrl.searchParams.get('roomId');
  if (roomId) {
    url.searchParams.set('roomId', roomId);
  }

  window.location.href = url.href;
}

export function getCurrentArticle() {
  return getArticleFromUrl(window.location.href).article;
}

export function isSpecialArticle(article) {
  return typeof article === 'string' && (
    article.startsWith('Special:')
    || article.startsWith('Help:')
    || article.startsWith('Wikipedia:')
    || article.startsWith('Talk:')
    || article.startsWith('Main_Page')
    || article.startsWith('File:'));
}

export function getLinkWithRoomId(article, roomId = getRoomId()) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(article)}?roomId=${encodeURIComponent(roomId)}`;
}