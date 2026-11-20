// Single-user setup: every GitHub API call (listing repos, posting review
// comments, opening PRs from Quick Check) uses the static GITHUB_TOKEN from
// .env. There's no per-user login — webhooks are wired up by manually
// pointing each repo's webhook settings at SMEE_URL, not by an OAuth app
// registering them on your behalf.
function resolveGithubAuth() {
  if (!process.env.GITHUB_TOKEN) return null;
  return { token: process.env.GITHUB_TOKEN };
}

module.exports = { resolveGithubAuth };
