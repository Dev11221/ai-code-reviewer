import { useEffect, useMemo, useState } from 'react';
import { Trash2, Search, X, GitPullRequest, FileUp } from 'lucide-react';
import api from '../api.js';
import { useLive } from '../context/LiveContext.jsx';
import StatCards from './StatCards.jsx';
import TrendsChart from './TrendsChart.jsx';

export default function Dashboard({ onSelectReview, activeRepo, onClearRepoFilter, navigate }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const { version } = useLive();

  useEffect(() => {
    setLoading(true);
    api
      .getReviews()
      .then(setReviews)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [version]);

  const nameFor = (review) =>
    review.source_type === 'github_pr'
      ? `${review.repo_owner}/${review.repo_name} #${review.pr_number}`
      : review.file_name;

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (activeRepo) {
        const full = `${r.repo_owner}/${r.repo_name}`;
        if (full !== activeRepo) return false;
      }
      if (!search.trim()) return true;
      const haystack = `${nameFor(r)} ${r.source_type}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [reviews, search, activeRepo]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <div className="dashboard">
      <StatCards reviews={reviews} />

      <div className="panel">
        <div className="panel-header">
          <h3>Reviews</h3>
          <div className="table-toolbar">
            {activeRepo && (
              <button className="chip chip-active" onClick={onClearRepoFilter}>
                {activeRepo} <X size={12} />
              </button>
            )}
            <div className="search-box">
              <Search size={14} />
              <input
                placeholder="Search reviews…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading && <div className="state-msg">Loading reviews…</div>}
        {error && <div className="state-msg state-error">Couldn't load reviews: {error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="state-msg">
            {reviews.length === 0
              ? 'No reviews yet. Open a PR on a connected repo to generate one.'
              : 'No reviews match your search.'}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Repo / File</th>
                <th>Date</th>
                <th>Findings</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((review) => (
                <tr key={review.id} onClick={() => onSelectReview(review.id)}>
                  <td>
                    <span className={`badge ${review.source_type}`}>
                      {review.source_type === 'github_pr' ? (
                        <>
                          <GitPullRequest size={12} /> PR
                        </>
                      ) : (
                        <>
                          <FileUp size={12} /> Upload
                        </>
                      )}
                    </span>
                  </td>
                  <td className="mono-cell">{nameFor(review)}</td>
                  <td className="muted-cell">{new Date(review.created_at).toLocaleString()}</td>
                  <td>
                    <span className={`finding-count ${review.finding_count > 0 ? 'has-findings' : ''}`}>
                      {review.finding_count}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {confirmId === review.id ? (
                      <span className="confirm-delete" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-danger-sm"
                          onClick={() => handleDelete(review.id)}
                          disabled={deletingId === review.id}
                        >
                          {deletingId === review.id ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button className="btn-ghost-sm" onClick={() => setConfirmId(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        className="icon-btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmId(review.id);
                        }}
                        title="Delete review"
                        aria-label="Delete review"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <TrendsChart />
    </div>
  );
}
