![header](https://user-images.githubusercontent.com/5902356/96493914-d0484880-126f-11eb-9c2a-9f739b92686f.png)

<p>
  <a href="https://chrome.google.com/webstore/detail/multiplayer-wikigame/hlgnjjenjinpaiilhmjpejjjphieejdb" alt="Download from Chrome Web Store" title="Download from Chrome Web Store">
    <img src="https://img.shields.io/chrome-web-store/v/hlgnjjenjinpaiilhmjpejjjphieejdb?style=flat-square" /></a>
</p>

Wikigame is a Chrome extension to play [Wikiracing](https://en.wikipedia.org/wiki/Wikiracing) directly on the Wikipedia pages!

Install the latest version to your browser from [Chrome web store](https://chrome.google.com/webstore/detail/multiplayer-wikigame/hlgnjjenjinpaiilhmjpejjjphieejdb). This extension works on any Chromium-based browsers, and tested well on the latest versions of [Google Chrome](https://www.google.com/chrome/), [Brave](https://brave.com/), [Opera](https://www.opera.com/), [Microsoft Edge](https://www.microsoft.com/en-us/edge). (Firefox extension is on the way!)

![demo](https://user-images.githubusercontent.com/5902356/96494181-3208b280-1270-11eb-800f-82cf99ee5174.gif)

## What's Wikiracing?

[Wikiracing](https://en.wikipedia.org/wiki/Wikiracing) is a game where you try to find a path between two Wikipedia pages by clicking the links in the articles.

## Features

- Create custom room to play with your friends
- Search articles with autocomplete, or pick completely random articles
- Custom scoring metrics (time, clicks, or combined)
- Custom rules
  - Ban some articles
  - Disable Ctrl+F
  - Disable [disambiguation pages](https://en.wikipedia.org/wiki/Category%3ADisambiguation_pages)
  - ... and more to come!

## Issues and Feature Requests

If you encounter issues or want something to be implemented in Wikigame, please [open an issue](https://github.com/azaky/wikigame/issues/new).

## Developing and Contributing

First, you should setup git hooks on the top level directory with the following command:

```
# on the repository root directory
npm install
```

This repository consists of two main components: [the extension](https://github.com/azaky/wikigame/tree/master/extension) and [the server](https://github.com/azaky/wikigame/tree/master/server). Take a look at each directory for specific guides to developing each components.

## License and Credits

This repository is licensed under MIT.

The logo and its derivations (images, banners, etc.) are created by [@miffos](https://twitter.com/miffos).

## Related Links

- [https://www.thewikigame.com/](https://www.thewikigame.com/) -- a website to play Wikiracing. I created this extension because I love playing there (in the thewikigame.com), but finding the lack of customizations and rules. (disclaimer: this extension is not affiliated with that website in any way)
- [Six Degrees of Wikipedia](https://www.sixdegreesofwikipedia.com/) -- a website to find a path between two Wikipedia pages. This project uses SDOW link to show the solutions after each round.
