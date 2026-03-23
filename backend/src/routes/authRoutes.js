const express = require('express');
const { signup, login, profile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/profile', requireAuth, profile);

module.exports = router;
