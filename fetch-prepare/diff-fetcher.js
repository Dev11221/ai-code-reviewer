'use strict';
const axios = require('axios');

async function fetchDiff(owner, repo, pullNumber, token) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${Number(pullNumber)}`;

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3.diff' },
    timeout: 30000,
    maxContentLength: 20 * 1024 * 1024, // a huge diff must not exhaust memory
    responseType: 'text',
    transformResponse: (d) => d,
  });

  return response.data;
}

async function fetchRepositoryContext(owner, repo, pullNumber, token, changedPaths = []) {
  const client = axios.create({
    baseURL: 'https://api.github.com',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    timeout: 20000,
  });
  try {
    const { data: pr } = await client.get(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
    const { data: tree } = await client.get(`/repos/${owner}/${repo}/git/trees/${pr.head.sha}?recursive=1`);
    const candidates = (tree.tree || []).filter((item) => item.type === 'blob' && item.size <= 30000)
      .map((item) => item.path)
      .filter((p) => /(^|\/)(README|CONTRIBUTING|AGENTS|ARCHITECTURE|SECURITY)(\.[^/]*)?$/i.test(p) || changedPaths.some((c) => {
        const dir = c.slice(0, c.lastIndexOf('/'));
        return dir && (p.startsWith(`${dir}/`) || p === `${dir}/index.js` || p === `${dir}/index.ts`);
      }))
      .filter((p) => !/(^|\/)(\.git|node_modules|vendor|dist|build)(\/|$)|(^|\/)(\.env([^/]*)?|.*\.(pem|key|p12|pfx))$/i.test(p))
      .slice(0, 20);
    const files = [];
    for (const p of candidates) {
      try {
        const { data } = await client.get(`/repos/${owner}/${repo}/contents/${p}`, { params: { ref: pr.head.sha } });
        if (data.encoding === 'base64' && data.content) files.push({ path: p, content: Buffer.from(data.content, 'base64').toString('utf8') });
      } catch { /* an individual file can disappear during a force push */ }
    }
    return files;
  } catch (err) {
    console.warn('[review-context] repository context unavailable:', err.message);
    return [];
  }
}

module.exports = { fetchDiff, fetchRepositoryContext };
