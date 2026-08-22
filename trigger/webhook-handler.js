const express = require('express');
const router = express.Router();
const { fetchDiff } = require('../fetch-prepare/diff-fetcher');
const { analyzeDiff } = require('../review-engine/llm-analyzer');
const { postComment } = require('../delivery/github-comments');

router.post('/github', async (req, res) => {
  const event = req.body;

  if (event.action === 'opened' || event.action === 'synchronize') {
    const owner = event.repository.owner.login;
    const repo = event.repository.name;
    const pullNumber = event.pull_request.number;

    console.log(`Fetching diff for PR #${pullNumber} in ${owner}/${repo}...`);

    try {
      const diff = await fetchDiff(owner, repo, pullNumber);
      console.log('--- DIFF FETCHED ---');

      console.log('Sending diff to Gemini for review...');
      const review = await analyzeDiff(diff);

      console.log('--- AI REVIEW ---');
      console.log(review);

      console.log('Posting comment to GitHub...');
      const commentBody = `**AI Code Review**\n\n${review}`;
      await postComment(owner, repo, pullNumber, commentBody);

      console.log('--- COMMENT POSTED ---');
    } catch (error) {
      console.error('Error:', error.message);
    }
  }

  res.status(200).send('Received');
});

module.exports = router;