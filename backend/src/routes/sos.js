const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const { lat, lng, userId } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Location is required' });
  }

  const sosEvent = {
    id: Date.now(),
    userId: userId || 'anonymous',
    location: { lat, lng },
    timestamp: new Date().toISOString(),
    status: 'TRIGGERED',
    message: 'Emergency SOS alert received'
  };

  console.log('🚨 SOS ALERT TRIGGERED:', sosEvent);

  res.json({
    success: true,
    message: 'Emergency services have been notified',
    alertId: sosEvent.id,
    timestamp: sosEvent.timestamp
  });
});

module.exports = router;
