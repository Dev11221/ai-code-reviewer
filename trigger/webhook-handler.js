const express = require('express');
const router = express.Router();
const { fetchDiff } = require('../fetch-prepare/diff-fetcher');
const { analyzeDiff } = require('../review-engine/llm-analyzer');
const { runStaticAnalysis } = require('../review-engine/static-analyzer');
const { mergeFindings } = require('../review-engine/merge-findings');
const { postComment } = require('../delivery/github-comments');

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

  console.log(`Fetching diff for PR #${pullNumber} in ${owner}/${repo}...`);

  let diff;
  try {
    diff = await fetchDiff(owner, repo, pullNumber);
    console.log('--- DIFF FETCHED ---');
  } catch (err) {
    console.error('FAILED at fetchDiff:', err.message);
    return;
  }

  let staticFindings;
  try {
    console.log('Running static analysis...');
    staticFindings = await runStaticAnalysis(diff);
    console.log(`Static analysis found ${staticFindings.length} issue(s).`);
  } catch (err) {
    console.error('FAILED at runStaticAnalysis:', err.message);
    staticFindings = [];
  }

  let llmFindings;
  try {
    console.log('Sending diff to Gemini for review...');
    llmFindings = await analyzeDiff(diff, staticFindings);
  } catch (err) {
    console.error('FAILED at analyzeDiff:', err.message);
    llmFindings = [];
  }

  const review = mergeFindings(staticFindings, llmFindings);
  console.log('--- COMBINED REVIEW ---');
  console.log(review);

  try {
    console.log('Posting comment to GitHub...');
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
    console.log('--- COMMENT POSTED ---');
  } catch (err) {
    console.error('FAILED at postComment:', err.message);
  }
}

module.exports = router;