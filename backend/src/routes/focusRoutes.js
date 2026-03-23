const express = require('express');
const { startFocus, stopFocus, getStats } = require('../controllers/focusController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/startFocus', requireAuth, startFocus);
router.post('/stopFocus', requireAuth, stopFocus);
router.get('/getStats', requireAuth, getStats);

module.exports = router;
