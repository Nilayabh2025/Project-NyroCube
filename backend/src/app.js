const path = require('path');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const focusRoutes = require('./routes/focusRoutes');
const reportRoutes = require('./routes/reportRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const { requireAuth } = require('./middleware/authMiddleware');
const { startFocus, stopFocus, getStats } = require('./controllers/focusController');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const env = require('./config/env');

function buildApp(db) {
  const app = express();

  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'NyroCube API' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/focus', focusRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/device', deviceRoutes);

  app.post('/startFocus', requireAuth, startFocus);
  app.post('/stopFocus', requireAuth, stopFocus);
  app.get('/getStats', requireAuth, getStats);

  app.use(express.static(path.resolve(__dirname, '../../frontend')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    res.sendFile(path.resolve(__dirname, '../../frontend/index.html'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  app.set('db', db);

  return app;
}

module.exports = { buildApp };
