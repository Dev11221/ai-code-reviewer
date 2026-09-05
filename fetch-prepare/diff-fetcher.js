const axios = require('axios');

async function fetchDiff(owner, repo, pullNumber) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3.diff',
    },
  });

  return response.data;
}

module.exports = { fetchDiff };
