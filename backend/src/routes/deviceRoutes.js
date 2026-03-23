const express = require('express');
const { ingestDeviceEvent } = require('../controllers/focusController');
const { requireExternalApiKey } = require('../middleware/apiKeyMiddleware');

const router = express.Router();

router.post('/telemetry', requireExternalApiKey, ingestDeviceEvent);

module.exports = router;
