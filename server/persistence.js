const redis = require('redis');

require('bluebird').promisifyAll(redis);

let client;

const isRedisUp = (url) => {
  return new Promise((resolve) => {
    const _client = redis.createClient(url);
    const timeout = setTimeout(() => {
      console.log('isRedisUp timeout');
      _client.quit();
      resolve(false);
    }, 1000);
    _client.on('error', (err) => {
      console.log('isRedisUp error', err);
      clearTimeout(timeout);
      resolve(false);
    });
    _client.on('ready', () => {
      console.log('isRedisUp ready');
      clearTimeout(timeout);
      resolve(true);
      _client.quit();
    });
  });
};

const init = async () => {
  const url = process.env.REDIS_URL;
  console.log('init', url);
  if (!url) return false;

  if (!(await isRedisUp(url))) return false;

  client = redis.createClient(url);
  return true;
};

const load = async () => {
  try {
    const raw = await client.getAsync('data');
    console.log('persistence.load data:', raw);
    const data = JSON.parse(raw);
    return data || [];
  } catch (e) {
    console.error('persistence.load error:', e);
    return [];
  }
};

const store = async (data) => {
  try {
    await client.setAsync('data', JSON.stringify(data));
  } catch (e) {
    console.error('persistence.store error:', e);
  }
};

module.exports = {
  init,
  load,
  store,
};
