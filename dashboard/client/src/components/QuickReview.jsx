import { useState } from 'react';
import { Code2, Play, Github, ExternalLink, Loader2 } from 'lucide-react';
import api from '../api.js';
import { useGithub } from '../context/GithubContext.jsx';

const SEVERITY_ORDER = { blocking: 0, warning: 1, nitpick: 2 };

export default function QuickReview({ onOpenReview }) {
  const [code, setCode] = useState('');
  const [fileName, setFileName] = useState('snippet.py');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { reviewId, findings, overallScore }

  const [showPrForm, setShowPrForm] = useState(false);
  const [prState, setPrState] = useState({
    owner: '',
    repo: '',
    branchName: `quick-check-${Date.now()}`,
    commitMessage: '',
    prTitle: '',
    prBody: '',
  });
  const [prSubmitting, setPrSubmitting] = useState(false);
  const [prResult, setPrResult] = useState(null);
  const [prError, setPrError] = useState(null);

  const { connected, repos } = useGithub();

  const runReview = async () => {
    if (!code.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setPrResult(null);
    try {
      const data = await api.runQuickReview(code, fileName);
      setResult(data);
      setPrState((s) => ({
        ...s,
        commitMessage: `Add ${fileName}`,
        prTitle: `Add ${fileName}`,
      }));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setRunning(false);
    }
  };

  const submitPr = async () => {
    if (!prState.owner || !prState.repo || !prState.branchName) return;
    setPrSubmitting(true);
    setPrError(null);
    try {
      const data = await api.createPrFromReview(result.reviewId, prState);
      setPrResult(data);
    } catch (err) {
      setPrError(err.response?.data?.error || err.message);
    } finally {
      setPrSubmitting(false);
    }
  };

  const sortedFindings = result?.findings
    ? [...result.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    : [];

  return (
    <div className="quick-review">
      <div className="panel-header-plain">
        <h2><Code2 size={20} /> Quick Check</h2>
        <p>Paste or write code and get an instant review — no GitHub PR needed. Like what you see? Push it straight to a repo below.</p>
      </div>

      <div className="panel quick-review-editor">
        <div className="quick-review-toolbar">
          <input
            className="filename-input"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="filename.py"
          />
          <button className="btn-primary" onClick={runReview} disabled={running || !code.trim()}>
            {running ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
            {running ? 'Reviewing…' : 'Run review'}
          </button>
        </div>
        <textarea
          className="code-textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste or write your code here…"
          spellCheck={false}
        />
      </div>

      {error && <div className="state-msg state-error">{error}</div>}

      {result && (
        <div className="panel">
          <div className="panel-header">
            <h3>Results</h3>
            <span className={`score-badge tone-${result.overallScore >= 80 ? 'good' : result.overallScore >= 50 ? 'mid' : 'bad'}`}>
              Score {result.overallScore}
            </span>
          </div>

          {sortedFindings.length === 0 && <div className="state-msg">No issues found. 🎉</div>}

          {sortedFindings.map((f, i) => (
            <div className="finding-card" key={i}>
              <div className="finding-card-head">
                <div className="file-path">{f.filePath}</div>
                <div className="finding-card-tags">
                  <span className={`severity-pill ${f.severity}`}>{f.severity}</span>
                  {f.category && <span className="category-pill">{f.category}</span>}
                </div>
              </div>
              <p className="issue">{f.issue}</p>
              <p className="suggestion">{f.suggestion}</p>
            </div>
          ))}

          <div className="quick-review-footer">
            <button className="btn-ghost-sm" onClick={() => onOpenReview(result.reviewId)}>
              View as full review
            </button>
            {connected && (
              <button className="btn-primary" onClick={() => setShowPrForm((s) => !s)}>
                <Github size={15} /> {showPrForm ? 'Hide' : 'Push to GitHub / Create PR'}
              </button>
            )}
          </div>
        </div>
      )}

      {showPrForm && result && (
        <div className="panel pr-form">
          <div className="panel-header">
            <h3>Create pull request</h3>
          </div>
          <div className="pr-form-grid">
            <label>
              Repo
              <select
                value={prState.owner && prState.repo ? `${prState.owner}/${prState.repo}` : ''}
                onChange={(e) => {
                  const [owner, repo] = e.target.value.split('/');
                  setPrState((s) => ({ ...s, owner, repo }));
                }}
              >
                <option value="">Select a repo…</option>
                {repos.map((r) => (
                  <option key={r.id} value={r.fullName}>{r.fullName}</option>
                ))}
              </select>
            </label>
            <label>
              Branch name
              <input
                value={prState.branchName}
                onChange={(e) => setPrState((s) => ({ ...s, branchName: e.target.value }))}
              />
            </label>
            <label>
              Commit message
              <input
                value={prState.commitMessage}
                onChange={(e) => setPrState((s) => ({ ...s, commitMessage: e.target.value }))}
              />
            </label>
            <label>
              PR title
              <input
                value={prState.prTitle}
                onChange={(e) => setPrState((s) => ({ ...s, prTitle: e.target.value }))}
              />
            </label>
            <label className="pr-form-full">
              PR description
              <textarea
                rows={3}
                value={prState.prBody}
                onChange={(e) => setPrState((s) => ({ ...s, prBody: e.target.value }))}
              />
            </label>
          </div>

          {prError && <div className="state-msg state-error">{prError}</div>}
          {prResult && (
            <div className="state-msg">
              PR opened —{' '}
              <a href={prResult.prUrl} target="_blank" rel="noreferrer">
                #{prResult.prNumber} <ExternalLink size={12} />
              </a>
            </div>
          )}

          <button
            className="btn-primary"
            onClick={submitPr}
            disabled={prSubmitting || !prState.owner || !prState.repo}
          >
            {prSubmitting ? <Loader2 size={15} className="spin" /> : <Github size={15} />}
            {prSubmitting ? 'Creating…' : 'Create PR'}
          </button>
        </div>
      )}
    </div>
  );
}
