const express = require('express');
const axios = require('axios');
const router = express.Router();
const { analyzeDiff } = require('../../review-engine/llm-analyzer');
const { runStaticAnalysis } = require('../../review-engine/static-analyzer');
const { mergeFindings, computeOverallScore } = require('../../review-engine/merge-findings');
const { createReview, saveFinding, getReviewById } = require('../../findings/db');
const { reviewEvents } = require('../../lib/events');
const { resolveGithubAuth } = require('../../lib/session');

function buildSyntheticDiff(fileName, code) {
  const lines = code.split('\n');
  const body = lines.map((l) => `+${l}`).join('\n');
  return [
    `diff --git a/${fileName} b/${fileName}`,
    'new file mode 100644',
    'index 0000000..0000000',
    '--- /dev/null',
    `+++ b/${fileName}`,
    `@@ -0,0 +1,${lines.length} @@`,
    body,
  ].join('\n');
}

router.post('/quick-review', async (req, res) => {
  const { code, fileName } = req.body;
  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'No code provided.' });
  }
  const safeFileName = (fileName && fileName.trim()) || 'snippet.txt';
  const diff = buildSyntheticDiff(safeFileName, code);

  try {
    const staticFindings = await runStaticAnalysis(diff).catch((err) => {
      console.error('FAILED at runStaticAnalysis (quick review):', err.message);
      return [];
    });
    const llmFindings = await analyzeDiff(diff, staticFindings).catch((err) => {
      console.error('FAILED at analyzeDiff (quick review):', err.message);
      return [];
    });
    const review = mergeFindings(staticFindings, llmFindings);
    const overallScore = computeOverallScore(review);

    const reviewId = await createReview({
      sourceType: 'quick_check',
      fileName: safeFileName,
      diffText: diff,
      sourceCode: code,
      overallScore,
    });
    for (const finding of review) {
      await saveFinding(reviewId, finding);
    }

    reviewEvents.emit('change', { type: 'review-created', reviewId });

    res.json({ reviewId, findings: review, overallScore });
  } catch (err) {
    console.error('Quick review failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/quick-review/:id/create-pr', async (req, res) => {
  const auth = resolveGithubAuth();
  if (!auth) return res.status(401).json({ error: 'GITHUB_TOKEN is not set in .env' });

  const { owner, repo, branchName, commitMessage, prTitle, prBody, baseBranch } = req.body;
  if (!owner || !repo || !branchName) {
    return res.status(400).json({ error: 'owner, repo, and branchName are required.' });
  }

  const review = await getReviewById(req.params.id);
  if (!review || !review.source_code) {
    return res.status(404).json({ error: 'Review not found, or it has no stored source code.' });
  }

  const client = axios.create({
    baseURL: 'https://api.github.com',
    headers: { Authorization: `Bearer ${auth.token}`, Accept: 'application/vnd.github+json' },
  });

  try {
    const base = baseBranch || (await client.get(`/repos/${owner}/${repo}`)).data.default_branch;

    const { data: baseRef } = await client.get(`/repos/${owner}/${repo}/git/ref/heads/${base}`);
    await client.post(`/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${branchName}`,
      sha: baseRef.object.sha,
    });

    const filePath = review.file_name || 'snippet.txt';
    const contentB64 = Buffer.from(review.source_code, 'utf8').toString('base64');

    await client.put(`/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`, {
      message: commitMessage || `Add ${filePath} via AI Code Reviewer`,
      content: contentB64,
      branch: branchName,
    });

    const { data: pr } = await client.post(`/repos/${owner}/${repo}/pulls`, {
      title: prTitle || `Add ${filePath}`,
      body: prBody || 'Opened from the AI Code Reviewer dashboard.',
      head: branchName,
      base,
    });

    res.json({ success: true, prUrl: pr.html_url, prNumber: pr.number });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.response?.data?.message || err.message });
  }
});

module.exports = router;
