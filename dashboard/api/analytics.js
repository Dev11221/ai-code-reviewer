const express = require('express');
const router = express.Router();
const { getFindingCountsBySeverity } = require('../../findings/db');

// GET /api/analytics/severity -> [{ severity: 'blocking', count: 4 }, ...]
// Powers the optional TrendsChart bar chart.
router.get('/analytics/severity', async (req, res) => {
  try {
    const counts = await getFindingCountsBySeverity();
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
