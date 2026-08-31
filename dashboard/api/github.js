const express = require('express');
const axios = require('axios');
const router = express.Router();

// This app authenticates to GitHub with the personal access token already
// sitting in .env (GITHUB_TOKEN) — the dashboard never asks the user to type
// or paste a token. These two routes just let the frontend check whether
// that token is valid and list the repos it can see.

function githubClient() {
  return axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });
}

// GET /api/github/status -> whether GITHUB_TOKEN is present & valid, plus
// the authenticated user's profile (used for the Connect/Connected button).
router.get('/github/status', async (req, res) => {
  if (!process.env.GITHUB_TOKEN) {
    return res.json({ connected: false, reason: 'GITHUB_TOKEN is not set in .env' });
  }
  try {
    const { data } = await githubClient().get('/user');
    res.json({
      connected: true,
      login: data.login,
      name: data.name,
      avatarUrl: data.avatar_url,
      profileUrl: data.html_url,
    });
  } catch (err) {
    res.json({
      connected: false,
      reason: err.response?.status === 401 ? 'GITHUB_TOKEN is invalid or expired' : err.message,
    });
  }
});

// GET /api/github/repos -> repos visible to the token, newest-updated first.
router.get('/github/repos', async (req, res) => {
  if (!process.env.GITHUB_TOKEN) {
    return res.status(400).json({ error: 'GITHUB_TOKEN is not set in .env' });
  }
  try {
    const { data } = await githubClient().get('/user/repos', {
      params: { sort: 'updated', per_page: 100, affiliation: 'owner,collaborator,organization_member' },
    });
    const repos = data.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login,
      private: r.private,
      description: r.description,
      htmlUrl: r.html_url,
      language: r.language,
      stars: r.stargazers_count,
      updatedAt: r.updated_at,
      defaultBranch: r.default_branch,
    }));
    res.json(repos);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

module.exports = router;
