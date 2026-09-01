import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api.js';

const GithubContext = createContext(null);

// NOTE on "connect / disconnect": this app authenticates to GitHub with the
// GITHUB_TOKEN already sitting in your .env — there's no OAuth flow and the
// dashboard never asks you to paste a token. "Connected" here means "the
// server's token is present and valid". Clicking the button when connected
// does a *local* disconnect: it hides the repo list / status in this browser
// tab (stored in localStorage) without touching your .env token, since the
// server has no safe way to revoke or forget a token you set yourself. Click
// it again to reconnect instantly — no re-auth needed, the token never left.
export function GithubProvider({ children }) {
  const [status, setStatus] = useState({ loading: true, connected: false });
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [locallyDisconnected, setLocallyDisconnected] = useState(
    () => localStorage.getItem('acr-github-disconnected') === '1'
  );

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

  const connected = status.connected && !locallyDisconnected;

  useEffect(() => {
    if (!connected) {
      setRepos([]);
      return;
    }
    setReposLoading(true);
    api
      .getGithubRepos()
      .then(setRepos)
      .catch(() => setRepos([]))
      .finally(() => setReposLoading(false));
  }, [connected]);

  const toggleConnection = () => {
    setLocallyDisconnected((prev) => {
      const next = !prev;
      localStorage.setItem('acr-github-disconnected', next ? '1' : '0');
      return next;
    });
  };

  return (
    <GithubContext.Provider
      value={{ ...status, connected, repos, reposLoading, toggleConnection, refreshStatus }}
    >
      {children}
    </GithubContext.Provider>
  );
}

export function useGithub() {
  return useContext(GithubContext);
}
