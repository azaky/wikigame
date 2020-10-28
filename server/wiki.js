const express = require('express');

const links10k = require('../scripts/wikidigest/enwiki-links-10k.json');

const handler = () => {
  const router = express.Router();

  router.get('/random', async (req, res) => {
    const data = links10k[Math.floor(Math.random() * links10k.length)];
    res.json({ data });
  });

  return router;
};

module.exports = {
  handler: handler(),
};
