const express = require('express');
const router = express.Router();
const { heatmapPoints } = require('../data/zones');

router.get('/', (req, res) => {
  res.json(heatmapPoints);
});

module.exports = router;
