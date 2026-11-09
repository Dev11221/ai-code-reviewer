import { useEffect, useState } from 'react';
import { Github, X, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { useGithub } from '../context/GithubContext.jsx';

// Where users create the token. Opens GitHub's "new token" page with the right
// permission (repo) and a name already filled in.
const NEW_TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=repo&description=' + encodeURIComponent('AI Code Reviewer');

export default function ConnectModal() {
  const { connectOpen, closeConnect, connectWithToken, githubAppEnabled } = useGithub();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!connectOpen) {
      setToken('');
      setError(null);
      setBusy(false);
      return undefined;
    }
    const onKey = (e) => e.key === 'Escape' && closeConnect();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [connectOpen, closeConnect]);

  if (!connectOpen) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!token.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await connectWithToken(token.trim());
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={closeConnect}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Connect GitHub" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <Github size={18} /> Connect GitHub
          </h3>
          <button className="icon-btn" onClick={closeConnect} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {githubAppEnabled ? <div className="github-app-connect">
          <div><strong>Connect with GitHub App</strong><p>Sign in with GitHub. The app can access repositories where it is installed—no personal token to paste.</p></div>
          <a className="btn-primary modal-wide" href="/api/auth/github/app/start"><Github size={15} /> Continue with GitHub <ExternalLink size={13} /></a>
          <a className="github-app-install-link" href="/api/auth/github/app/install">Install or manage repository access <ExternalLink size={12} /></a>
          <div className="connect-divider"><span>or use a personal token</span></div>
        </div> : <div className="connect-setup-note"><ShieldCheck size={15} /> GitHub App connection is not configured on this server yet. You can use a token for now.</div>}

        <ol className="modal-steps">
          <li>
            <a href={NEW_TOKEN_URL} target="_blank" rel="noreferrer">
              Create a token on GitHub <ExternalLink size={12} />
            </a>{' '}
            — the <b>repo</b> permission is already ticked. Pick any expiry, then click <b>Generate token</b>.
          </li>
          <li>Copy the token and paste it below.</li>
        </ol>

        <form onSubmit={submit}>
          <input
            className="modal-input"
            type="password"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="ghp_… or github_pat_…"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          {error && <div className="state-msg state-error">{error}</div>}
          <button className="btn-primary modal-wide" type="submit" disabled={busy || !token.trim()}>
            {busy ? <Loader2 size={15} className="spin" /> : <Github size={15} />}
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        </form>

        <p className="modal-note">
          <ShieldCheck size={13} /> Stored encrypted on the server and tied to this browser. You stay connected next
          time — no need to repeat this. Sign out any time from the top bar.
        </p>
      </div>
    </div>
  );
}
