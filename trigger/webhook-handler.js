const express = require('express');
const router = express.Router();
const { fetchDiff } = require('../fetch-prepare/diff-fetcher');
const { analyzeDiff } = require('../review-engine/llm-analyzer');
const { runStaticAnalysis } = require('../review-engine/static-analyzer');
const { mergeFindings } = require('../review-engine/merge-findings');
const { postComment } = require('../delivery/github-comments');
const { createReview, saveFinding } = require('../findings/db');

router.post('/github', (req, res) => {
  const event = req.body;

  res.status(200).send('Received');

  if (event.action === 'opened' || event.action === 'synchronize') {
    processReview(event).catch(err => console.error('Background review error:', err.message));
  }
});

async function processReview(event) {
  const owner = event.repository.owner.login;
  const repo = event.repository.name;
  const pullNumber = event.pull_request.number;

  const startTime = Date.now();
  console.log(`Fetching diff for PR #${pullNumber} in ${owner}/${repo}...`);

  let diff;
  try {
    const t0 = Date.now();
    diff = await fetchDiff(owner, repo, pullNumber);
    console.log(`--- DIFF FETCHED (${((Date.now() - t0) / 1000).toFixed(1)}s) ---`);
  } catch (err) {
    console.error('FAILED at fetchDiff:', err.message);
    return;
  }

  let staticFindings;
  try {
    console.log('Running static analysis...');
    const t1 = Date.now();
    staticFindings = await runStaticAnalysis(diff);
    console.log(`Static analysis found ${staticFindings.length} issue(s). (${((Date.now() - t1) / 1000).toFixed(1)}s)`);
  } catch (err) {
    console.error('FAILED at runStaticAnalysis:', err.message);
    staticFindings = [];
  }

  let llmFindings;
  try {
    console.log('Sending diff to Gemini for review...');
    const t2 = Date.now();
    llmFindings = await analyzeDiff(diff, staticFindings);
    console.log(`Gemini review complete. (${((Date.now() - t2) / 1000).toFixed(1)}s)`);
  } catch (err) {
    console.error('FAILED at analyzeDiff:', err.message);
    llmFindings = [];
  }

  const review = mergeFindings(staticFindings, llmFindings);
  console.log('--- COMBINED REVIEW ---');
  console.log(review);

  try {
    console.log('Saving review to database...');
    const t3 = Date.now();
    const reviewId = await createReview({
      sourceType: 'github_pr',
      repoOwner: owner,
      repoName: repo,
      prNumber: pullNumber,
      diffText: diff,
    });

    for (const finding of review) {
      await saveFinding(reviewId, finding);
    }
    console.log(`--- SAVED REVIEW #${reviewId} WITH ${review.length} FINDING(S) (${((Date.now() - t3) / 1000).toFixed(1)}s) ---`);
  } catch (err) {
    console.error('FAILED at saving review/findings to DB:', err.message);
  }

  try {
    console.log('Posting comment to GitHub...');
    const t4 = Date.now();
    let commentBody;
    if (review.length === 0) {
      commentBody = '**AI Code Review**\n\nNo issues found.';
    } else {
      const formattedFindings = review.map(f =>
        `**File:** ${f.filePath}\n**Severity:** ${f.severity}\n**Category:** ${f.category}\n**Issue:** ${f.issue}\n**Suggestion:** ${f.suggestion}`
      ).join('\n\n---\n\n');
      commentBody = `**AI Code Review**\n\n${formattedFindings}`;
    }
    await postComment(owner, repo, pullNumber, commentBody);
    console.log(`--- COMMENT POSTED (${((Date.now() - t4) / 1000).toFixed(1)}s) ---`);
  } catch (err) {
    console.error('FAILED at postComment:', err.message);
  }

  const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`⏱ TOTAL TIME: ${totalSeconds}s for PR #${pullNumber}`);
}

module.exports = router;