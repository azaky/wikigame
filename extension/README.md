# Wikigame Chrome Extension

This chrome extension consists of:

- `src/`: Content script: built with ReactJS
- `static/background.js`: Background script using Socket.io and vanilla JS
- `static/manifest.json`: Chrome Extension manifest file
- `static/everything else`: anything else that should be included (but does not need any build step), like stylesheets and images.

## Build

```
npm install
npm run build
```

## Running & Developing Locally

- Go to [chrome://extensions](chrome://extensions).
- Ensure that **Developer mode is enabled** (toggle on the top-right).
- Click **Load unpacked**, then choose **`dist/`** folder (`<git-root>/wikigame/extension/dist`).
- Visit any article in Wikipedia, append `?roomId=1234` to the link (example: http://en.wikipedia.org/wiki/Wikiracing?roomId=1234)

If everything is loaded correctly, you will be prompted for the username, and then a sidebar on the left side should appear.

If you make some changes, the extension should be re-built and reloaded.

- Run `npm run build`.
- Go to [chrome://extensions](chrome://extensions).
- Click reload (you don't have to Load unpacked again after changes).

## Pre-commit hooks

When developing, you can enable pre-commit hooks (which will build and pack the extension to a zip on every commit) by:

```
npm run init-pre-commit
```
