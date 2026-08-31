import { Github, Sun, Moon, Menu, CircleDot } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useGithub } from '../context/GithubContext.jsx';

export default function Topbar({ onToggleSidebar, live, onNavigate }) {
  const { theme, toggleTheme } = useTheme();
  const { loading, connected, login, avatarUrl, reason, toggleConnection } = useGithub();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn mobile-only" onClick={onToggleSidebar} aria-label="Toggle menu">
          <Menu size={18} />
        </button>
        <button className="topbar-brand" onClick={() => onNavigate('/')}>
          <span className="topbar-brand-mark">AI</span>
          <span className="topbar-brand-text">Code Reviewer</span>
        </button>
      </div>

      <div className="topbar-right">
        <div className={`live-indicator ${live ? 'is-live' : ''}`} title={live ? 'Live updates connected' : 'Reconnecting…'}>
          <CircleDot size={13} />
          <span>{live ? 'Live' : 'Connecting…'}</span>
        </div>

        <button className="icon-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className={`github-btn ${connected ? 'is-connected' : ''}`}
          onClick={toggleConnection}
          disabled={loading}
          title={
            loading
              ? 'Checking GitHub connection…'
              : connected
              ? `Connected as ${login} — click to disconnect this session`
              : reason || 'Click to connect'
          }
        >
          {connected && avatarUrl ? (
            <img className="github-avatar" src={avatarUrl} alt="" />
          ) : (
            <Github size={16} />
          )}
          <span>{loading ? 'Checking…' : connected ? `Connected · ${login}` : 'Connect GitHub'}</span>
        </button>
      </div>
    </header>
  );
}
