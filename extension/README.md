# Wikigame Chrome Extension

This chrome extension consists of:

- `src/content_script`: content script, built with ReactJS
- `src/popup`: popup page, also built with ReactJS
- `src/background`: background script using socket.io
- `manifest.json`: Chrome extension manifest file
- `images/`: image assets (header, icons)

## Running & Developing Locally

First, ensure that node version &ge; 12 is installed.

To develop, run:

```
npm install
npm run dev
```

Now the extension will be generated to `dist/` folder, and file changes are automatically watched.

### Loading the Extension

To load the extension for the first time:

- Go to <a href="chrome://extensions">chrome://extensions</a>.
- Ensure that **Developer mode is enabled** (toggle on the top-right).
- Click **Load unpacked**, then choose **`dist/`** folder (`<git-root>/wikigame/extension/dist`).

If everything is loaded correctly, you will be redirected to [Wikiracing page](https://en.wikipedia.org/wiki/Wikiracing) with a welcome toast.

If you make some changes, even though the extension is automatically re-built, it should be reloaded manually from Chrome.

- Go to <a href="chrome://extensions">chrome://extensions</a>.
- Click reload (you don't have to Load unpacked again after changes).

### Developing with Local/Custom Server

By default, the extension will point the server to `https://wikigame-multiplayer.herokuapp.com/`.

When developing the server, you may want to point the server locally, which defaults at `http://localhost:9454`. Run this instead:

```
npm run dev-local
```

If for some reason you have different endpoint, specify `WIKIGAME_SERVER_URL` environment variable.

```
WIKIGAME_SERVER_URL=... npm run dev
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

## Building for Firefox

To build for Firefox, run the following:

```
# to build
npm run build-ff

# to build + zip
npm run pack-ff
```

In the code, you may perform check `if (process.env.FIREFOX) {...}` if a certain part of the code runs only on Firefox. Likewise, `if (!process.env.FIREFOX) {...}` can be used if the code runs only on Chrome.

## Versioning

We follow [semver](https://semver.org/) for versioning. On each build, `version` attribute in `manifest.json` gets rewritten by `version` from `package.json`, so don't change `version` attribute in `manifest.json`. We suggest to make separate commit for bumping version (like [this](https://github.com/azaky/wikigame/commit/cdfc3c553780cc72ce624f012c8232acfa0bd494)).
