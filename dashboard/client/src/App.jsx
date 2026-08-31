import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Dashboard from './components/Dashboard.jsx';
import PRDetail from './components/PRDetail.jsx';
import TablesPage from './components/TablesPage.jsx';
import { useRoute } from './utils/router.js';
import { useLive } from './context/LiveContext.jsx';

function parseReviewId(path) {
  const match = path.match(/^\/reviews\/(\d+)$/);
  return match ? match[1] : null;
}

export default function App() {
  const [path, go] = useRoute();
  const { live } = useLive();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 900);
  const [activeRepo, setActiveRepo] = useState(null);

  // Close the mobile sidebar automatically after navigating.
  useEffect(() => {
    if (window.innerWidth < 900) setCollapsed(true);
  }, [path]);

  const reviewId = parseReviewId(path);
  const route = reviewId ? '/reviews/:id' : path;

  const openReview = (id) => go(`/reviews/${id}`);
  const closeReview = () => go('/');

  return (
    <div className="app-shell">
      <Topbar onToggleSidebar={() => setCollapsed((c) => !c)} live={live} onNavigate={go} />
      <div className="app-body">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          route={path.startsWith('/reviews/') ? '/' : path}
          onNavigate={go}
          activeRepo={activeRepo}
          onFilterRepo={(repo) => {
            setActiveRepo(repo);
            if (path !== '/') go('/');
          }}
        />
        <main className="app-main">
          {reviewId && (
            <PRDetail reviewId={reviewId} onBack={closeReview} onDeleted={closeReview} />
          )}
          {!reviewId && path === '/tables' && <TablesPage />}
          {!reviewId && path !== '/tables' && (
            <Dashboard
              onSelectReview={openReview}
              activeRepo={activeRepo}
              onClearRepoFilter={() => setActiveRepo(null)}
              navigate={go}
            />
          )}
        </main>
      </div>
    </div>
  );
}
