'use strict';
const express = require('express');
const router = express.Router();
const { getReviewForUser, getFindingsByReview, setFindingFeedback, getFeedbackSummary } = require('../../findings/db');
const { requireGithubUser } = require('../../middleware/auth');
const { validate, idParam } = require('../../middleware/validate');
const { HttpError, wrap } = require('../../middleware/errors');
const { z } = require('zod');
const feedbackBody = z.strictObject({ feedback: z.enum(['useful', 'incorrect', 'duplicate']) });

router.get('/reviews/:id/findings', requireGithubUser, validate({ params: idParam }), wrap(async (req, res) => {
  // Scoped to the signed-in user: someone else's review id answers exactly like a missing one.
  const review = await getReviewForUser(req.params.id, req.ghUser.userId);
  if (!review) throw new HttpError(404, 'Review not found');
  const findings = await getFindingsByReview(review.id);
  // The stored source copies (used only for "Create PR") can be large and the detail
  // page doesn't need them - the diff already contains the code.
  const { source_code, source_files, owner_user_id, ...reviewForDisplay } = review;
  res.json({ review: reviewForDisplay, findings });
}));

router.post('/reviews/:id/findings/:findingId/feedback', requireGithubUser,
  validate({ params: z.object({ id: z.coerce.number().int().positive(), findingId: z.coerce.number().int().positive() }), body: feedbackBody }),
  wrap(async (req, res) => {
    const result = await setFindingFeedback(req.params.findingId, req.params.id, req.ghUser.userId, req.body.feedback);
    if (!result) throw new HttpError(404, 'Finding not found');
    res.json(result);
  }));

router.get('/analytics/feedback', requireGithubUser, wrap(async (req, res) => {
  res.json(await getFeedbackSummary(req.ghUser.userId));
}));

module.exports = router;
