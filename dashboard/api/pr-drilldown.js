const express = require('express');
const router = express.Router();
const { getReviewById, getFindingsByReview } = require('../../findings/db');

router.get('/reviews/:id/findings', async (req, res) => {
  try {
    const review = await getReviewById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    const findings = await getFindingsByReview(req.params.id);
    res.json({ review, findings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
