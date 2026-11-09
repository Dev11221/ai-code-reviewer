import { FileSearch, AlertTriangle, ShieldAlert, GitPullRequest } from 'lucide-react';

export default function StatCards({ reviews }) {
  const totalReviews = reviews.length;
  const totalFindings = reviews.reduce((sum, r) => sum + (r.finding_count || 0), 0);
  const prReviews = reviews.filter((r) => r.source_type === 'github_pr').length;
  const avgFindings = totalReviews ? (totalFindings / totalReviews).toFixed(1) : '0';

  const cards = [
    { label: 'Total reviews', value: totalReviews, note: 'Across your workspace', icon: FileSearch, tone: 'violet' },
    { label: 'PRs reviewed', value: prReviews, note: 'Automated GitHub reviews', icon: GitPullRequest, tone: 'teal' },
    { label: 'Total findings', value: totalFindings, note: 'Across completed reviews', icon: AlertTriangle, tone: 'amber' },
    { label: 'Avg. findings / review', value: avgFindings, note: 'Workspace average', icon: ShieldAlert, tone: 'rose' },
  ];

  return (
    <div className="stat-cards">
      {cards.map(({ label, value, note, icon: Icon, tone }) => (
        <div key={label} className={`stat-card tone-${tone}`}>
          <div className="stat-card-top"><div className="stat-card-label">{label}</div><div className="stat-card-icon"><Icon size={16} /></div></div>
          <div className="stat-card-value">{value}</div>
          <div className="stat-card-note">{note}</div>
        </div>
      ))}
    </div>
  );
}
