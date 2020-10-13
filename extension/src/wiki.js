export function getRandomPage() {
  return window.fetch('https://en.wikipedia.org/api/rest_v1/page/random/title')
    .then(res => res.json())
    .then(data => data.items && data.items.length && data.items[0].title);
}
