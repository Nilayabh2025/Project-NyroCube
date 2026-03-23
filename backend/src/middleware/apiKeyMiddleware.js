const env = require('../config/env');

function requireExternalApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== env.externalApiKey) {
    return res.status(401).json({ message: 'Invalid or missing API key.' });
  }

  next();
}

module.exports = { requireExternalApiKey };
