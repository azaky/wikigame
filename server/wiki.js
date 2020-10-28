const express = require('express');
const fetch = require('node-fetch');
const util = require('./util');

const links10k = require('../scripts/wikidigest/enwiki-links-10k.json');

const getRandomPage = (lang) =>
  fetch(`https://${getLang()}.wikipedia.org/api/rest_v1/page/random/title`)
    .then((res) => res.json())
    .then((data) => data.items && data.items.length && data.items[0].title);

const handler = () => {
  const router = express.Router();

  router.get('/random', async (req, res) => {
    const { lang } = req.query;
    if (lang === 'en') {
      const data = links10k[Math.floor(Math.random() * links10k.length)];
      res.json({ data });
    } else {
      if (!util.isLanguageValid(lang)) {
        res.status(400).json({ error: 'Invalid language' });
        return;
      }
      try {
        const title = await getRandomPage(lang);
        res.json({ data: { title } });
      } catch (e) {
        console.error(`Error getting random page (lang=${lang}):`, e);
        res.status(500).json({ error: 'Error fetching Wikipedia API' });
      }
    }
  });

  return router;
};

module.exports = {
  handler: handler(),
};
