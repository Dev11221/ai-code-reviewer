const express = require('express');
const router = express.Router();
const { getReviewById, getFindingsByReview, deleteReview } = require('../../findings/db');
const { reviewEvents } = require('../../lib/events');

// GET /api/reviews/:id/findings -> the review's own info + its list of findings
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

// DELETE /api/reviews/:id -> deletes the review and its findings.
router.delete('/reviews/:id', async (req, res) => {
  try {
    const deleted = await deleteReview(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Review not found' });
    }
    reviewEvents.emit('change', { type: 'review-deleted', reviewId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
