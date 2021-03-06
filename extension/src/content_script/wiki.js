import { getLang } from './util';

export function getRandomPage() {
  return window
    .fetch(`https://${getLang()}.wikipedia.org/api/rest_v1/page/random/title`)
    .then((res) => res.json())
    .then((data) => data.items && data.items.length && data.items[0].title);
}

export function resolveTitle(title) {
  return window
    .fetch(
      `https://${getLang()}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title
      )}`
    )
    .then((res) => res.json())
    .then((data) => data.titles && data.titles.canonical);
}

export function getAutocomplete(keyword) {
  const host = `https://${getLang()}.wikipedia.org`;
  const endpoint = '/w/api.php';
  const url = new URL(endpoint, host);

  // API Spec: https://en.wikipedia.org/w/api.php?action=help&modules=opensearch
  let queryParams = {
    action: 'opensearch',
    format: 'json',
    profile: 'fuzzy', // Supporting Typo
    search: keyword,
    limit: 5,
  };
  Object.keys(queryParams).forEach((key) =>
    url.searchParams.append(key, queryParams[key])
  );

  return window
    .fetch(url)
    .then((res) => res.json())
    .then((data) => data[1]);
}
