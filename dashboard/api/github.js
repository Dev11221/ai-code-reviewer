const express = require('express');
const axios = require('axios');
const router = express.Router();
const { resolveGithubAuth } = require('../../lib/session');

function githubClient(token) {
  return axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
}

router.get('/github/status', async (req, res) => {
  const auth = resolveGithubAuth();
  if (!auth) {
    return res.json({ connected: false, reason: 'GITHUB_TOKEN is not set in .env' });
  }
  try {
    const { data } = await githubClient(auth.token).get('/user');
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

router.get('/github/repos', async (req, res) => {
  const auth = resolveGithubAuth();
  if (!auth) {
    return res.status(401).json({ error: 'GITHUB_TOKEN is not set in .env' });
  }
  try {
    const { data } = await githubClient(auth.token).get('/user/repos', {
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
