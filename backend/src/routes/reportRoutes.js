const express = require('express');
const { getReports } = require('../controllers/focusController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, getReports);

module.exports = router;
