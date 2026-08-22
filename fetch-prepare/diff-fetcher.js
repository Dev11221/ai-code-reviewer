const axios = require('axios');

// This function fetches the diff for a specific PR
async function fetchDiff(owner, repo, pullNumber) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3.diff', // asks GitHub for diff format instead of JSON
    },
  });

  return response.data; // this will be the raw diff text
}

module.exports = { fetchDiff };