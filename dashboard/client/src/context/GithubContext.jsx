import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api.js';

const GithubContext = createContext(null);

// GitHub access is a single static GITHUB_TOKEN in .env — no per-user login.
// Reviews are triggered by pointing a repo's webhook (in GitHub's own repo
// settings) at SMEE_URL; this context just reports whether the token works
// and lists the repos it can see, for browsing/filtering in the dashboard.
export function GithubProvider({ children }) {
  const [status, setStatus] = useState({ loading: true, connected: false });
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);

  const refreshStatus = useCallback(() => {
    setStatus((s) => ({ ...s, loading: true }));
    api
      .getGithubStatus()
      .then((data) => setStatus({ loading: false, ...data }))
      .catch((err) => setStatus({ loading: false, connected: false, reason: err.message }));
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!status.connected) {
      setRepos([]);
      return;
    }
    setReposLoading(true);
    api
      .getGithubRepos()
      .then(setRepos)
      .catch(() => setRepos([]))
      .finally(() => setReposLoading(false));
  }, [status.connected]);

  return (
    <GithubContext.Provider
      value={{
        ...status,
        repos,
        reposLoading,
        refreshStatus,
      }}
    >
      {children}
    </GithubContext.Provider>
  );
}

export function useGithub() {
  return useContext(GithubContext);
}
