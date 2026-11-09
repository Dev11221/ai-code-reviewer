import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, Code2, ListChecks, SlidersHorizontal, ChevronUp, ChevronDown, Search } from 'lucide-react';
import api from '../api.js';
import DiffViewer from './DiffViewer.jsx';

// Fetches GET /api/reviews/:id/findings, which returns { review, findings }.
export default function PRDetail({ reviewId, onBack }) {
  const [review, setReview] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('findings');
  const [severity, setSeverity] = useState('all');
  const [query, setQuery] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const reviewPane = useRef(null);
  const reviewContent = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setReview(null);
    setFindings([]);
    setScrollProgress(0);
    api
      .getReview(reviewId)
      .then((data) => {
        setReview(data.review);
        setFindings(data.findings);
      })
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [reviewId]);

  useEffect(() => {
    const pane = reviewPane.current;
    if (!pane) return undefined;
    const update = () => {
      const max = pane.scrollHeight - pane.clientHeight;
      setScrollProgress(max > 0 ? pane.scrollTop / max : 0);
    };
    update();
    pane.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(pane);
    if (reviewContent.current) observer.observe(reviewContent.current);
    return () => { pane.removeEventListener('scroll', update); observer.disconnect(); };
  }, [loading, tab, findings.length]);

  const visibleFindings = useMemo(() => findings.filter((finding) => {
    if (severity !== 'all' && finding.severity !== severity) return false;
    const term = query.trim().toLowerCase();
    return !term || `${finding.file_path} ${finding.issue} ${finding.suggestion} ${finding.category || ''}`.toLowerCase().includes(term);
  }), [findings, severity, query]);

  const jumpToFile = (filePath) => {
    setTab('diff');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = [...(reviewContent.current?.querySelectorAll('[data-diff-file]') || [])]
        .find((node) => node.dataset.diffFile === filePath);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!target) reviewPane.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }));
  };

  const title = review
    ? review.source_type === 'github_pr'
      ? `${review.repo_owner}/${review.repo_name} — PR #${review.pr_number}`
      : review.file_name
    : '';

  const githubUrl =
    review?.source_type === 'github_pr'
      ? `https://github.com/${review.repo_owner}/${review.repo_name}/pull/${review.pr_number}`
      : null;

  return (
    <div className="pr-detail">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} /> Back to all reviews
      </button>

      {loading && <div className="state-msg">Loading findings…</div>}
      {error && <div className="state-msg state-error">Couldn't load review: {error}</div>}

      {!loading && !error && review && (
        <div className="review-workspace">
          <div className="review-scroll-rail" aria-hidden="true">
            <span className="review-scroll-thumb" style={{ top: `${scrollProgress * 100}%` }} />
          </div>
          <div className="review-scroll-pane" ref={reviewPane}>
            <div ref={reviewContent}>
          <div className="detail-header">
            <div>
              <h2>{title}</h2>
              <div className="meta">
                {new Date(review.created_at).toLocaleDateString()} · {findings.length} finding
                {findings.length === 1 ? '' : 's'}
                {review.overall_score !== null && review.overall_score !== undefined && (
                  <> · Score {review.overall_score}</>
                )}
              </div>
            </div>
            <div className="detail-actions">
              {githubUrl && (
                <a className="btn-ghost-sm" href={githubUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} /> View on GitHub
                </a>
              )}
            </div>
          </div>

          <div className="detail-tabs">
            <button
              className={`detail-tab ${tab === 'findings' ? 'is-active' : ''}`}
              onClick={() => setTab('findings')}
            >
              <ListChecks size={14} /> Findings ({findings.length})
            </button>
            <button
              className={`detail-tab ${tab === 'diff' ? 'is-active' : ''}`}
              onClick={() => setTab('diff')}
            >
              <Code2 size={14} /> Changes
            </button>
          </div>

          {tab === 'findings' && (
            <div className="panel">
              {findings.length > 0 && <div className="finding-filters">
                <label className="finding-filter-select"><SlidersHorizontal size={14} /><select value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter findings by severity">
                  <option value="all">All severities</option><option value="blocking">Blocking</option><option value="warning">Warning</option><option value="nitpick">Nitpick</option>
                </select></label>
                <label className="finding-filter-search"><Search size={14} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter findings…" aria-label="Search findings" /></label>
                <span className="finding-filter-count">{visibleFindings.length} of {findings.length}</span>
              </div>}
              {findings.length === 0 && (
                <div className="state-msg">No issues found in this review. 🎉</div>
              )}
              {findings.length > 0 && visibleFindings.length === 0 && <div className="state-msg">No findings match these filters.</div>}
              {visibleFindings.map((finding) => (
                <div className="finding-card" key={finding.id}>
                  <div className="finding-card-head">
                    <button className="finding-file-link" onClick={() => jumpToFile(finding.file_path)} title="Open this file in Changes"><Code2 size={13} />{finding.file_path}<ExternalLink size={12} /></button>
                    <div className="finding-card-tags">
                      <span className={`severity-pill ${finding.severity}`}>{finding.severity}</span>
                      {finding.category && <span className="category-pill">{finding.category}</span>}
                    </div>
                  </div>
                  <p className="issue">{finding.issue}</p>
                  <p className="suggestion">{finding.suggestion}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'diff' && (
            <div className="panel">
              <DiffViewer diff={review.diff_text} onFileNodes={reviewContent} />
            </div>
          )}
            </div>
          </div>
          <div className="review-scroll-controls" aria-label="Review scroll controls">
            <button type="button" title="Scroll review up" aria-label="Scroll review up" onClick={() => reviewPane.current?.scrollBy({ top: -Math.max(220, reviewPane.current.clientHeight * 0.65), behavior: 'smooth' })}><ChevronUp size={15} /></button>
            <input type="range" min="0" max="1000" value={Math.round(scrollProgress * 1000)} aria-label="Scroll through review" onChange={(e) => {
              const pane = reviewPane.current;
              if (pane) pane.scrollTop = (Number(e.target.value) / 1000) * (pane.scrollHeight - pane.clientHeight);
            }} />
            <button type="button" title="Scroll review down" aria-label="Scroll review down" onClick={() => reviewPane.current?.scrollBy({ top: Math.max(220, reviewPane.current.clientHeight * 0.65), behavior: 'smooth' })}><ChevronDown size={15} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
