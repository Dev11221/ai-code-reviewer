const axios = require('axios');

// Posts a comment on a GitHub PR
async function postComment(owner, repo, pullNumber, commentBody) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`;

  await axios.post(
    url,
    { body: commentBody },
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );
}

module.exports = { postComment };