export function getRoomId() {
  return new URLSearchParams(window.location.search).get('roomId');
}

export function getAddrLang() {
  return window.location.hostname.split('.')[0];
}

export function getLang() {
  return encodeURIComponent(
    new URLSearchParams(window.location.search).get('lang') || getAddrLang()
  );
}

export function getRoomIdAndLang() {
  return {
    roomId: getRoomId(),
    lang: getLang(),
  };
}

export function setRoomIdOnUrl(roomId, lang) {
  const url = new URL(window.location.href);
  url.searchParams.set('roomId', roomId);
  url.searchParams.set('lang', lang || getLang());
  window.history.replaceState({}, document.title, url.pathname + url.search);
}

export function getLink(article) {
  return `https://${getLang()}.wikipedia.org/wiki/${encodeURIComponent(
    article
  )}`;
}

export function getArticleFromUrl(link) {
  const url = new URL(link);
  if (!url.hostname.endsWith('.wikipedia.org')) {
    return {};
  }
  if (url.pathname.startsWith('/wiki')) {
    return {
      article: decodeURIComponent(
        url.pathname.substr(url.pathname.lastIndexOf('/') + 1)
      ),
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

export function goto(article, lang) {
  const url = new URL(getLink(article));

  // preserve roomId
  const roomId = getRoomId();
  lang = lang || getLang();
  if (roomId) {
    url.searchParams.set('roomId', roomId);
    url.searchParams.set('lang', lang);
  }

  window.location.href = url.href;
}

export function getCurrentArticle() {
  return getArticleFromUrl(window.location.href).article;
}

export function isSpecialArticle(article) {
  // TODO: these prefixes differ in all languages ....
  return (
    typeof article === 'string' &&
    (article.startsWith('Special:') ||
      article.startsWith('Help:') ||
      article.startsWith('Wikipedia:') ||
      article.startsWith('Talk:') ||
      article.startsWith('Main_Page') ||
      article.startsWith('File:'))
  );
}

export function getLinkWithRoomId(article, roomId, lang) {
  if (!roomId) {
    const roomIdLang = getRoomIdAndLang();
    roomId = roomIdLang.roomId;
    lang = roomIdLang.lang;
  }
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(
    article
  )}?roomId=${encodeURIComponent(roomId)}&lang=${lang}`;
}
