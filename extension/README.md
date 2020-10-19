# Wikigame Chrome Extension

This chrome extension consists of:

- `src/content_script`: content script, built with ReactJS
- `src/background`: background script using socket.io
- `manifest.json`: Chrome extension manifest file
- `static/`: static files (e.g. icons)

## Running & Developing Locally

```
npm install
npm run dev
```

To develop with local server, run this instead.

```
npm run dev-local
```

Now the extension will be generated to `dist/` folder, and updates are automatically watched.

To load the extension for the first time:

- Go to [chrome://extensions](chrome://extensions).
- Ensure that **Developer mode is enabled** (toggle on the top-right).
- Click **Load unpacked**, then choose **`dist/`** folder (`<git-root>/wikigame/extension/dist`).
- Visit any article in Wikipedia, append `?roomId=1234` to the link (example: http://en.wikipedia.org/wiki/Wikiracing?roomId=1234)

If everything is loaded correctly, you will be prompted for the username, and then a sidebar on the left side should appear.

If you make some changes, even though the extension is automatically re-built, it should be reloaded manually from Chrome.

- Go to [chrome://extensions](chrome://extensions).
- Click reload (you don't have to Load unpacked again after changes).

## Pre-commit hooks

When developing, you can enable pre-commit hooks (which will build and pack the extension to a zip on every commit) by:

```
npm run init-pre-commit
```

## Build + packing into zip

To build for production, use:

```
npm run build
```

We also provide packing script:

```
npm run pack
```

which will run `npm run build` and then generates zipped file in the format of `wikigame-$version.zip`.
