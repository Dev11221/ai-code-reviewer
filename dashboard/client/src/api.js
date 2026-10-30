import axios from 'axios';

// The API runs on a different port (3000) than the Vite dev server (5173).
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const client = axios.create({ baseURL: `${API_BASE}/api` });

export const api = {
  API_BASE,
  getReviews: () => client.get('/reviews').then((r) => r.data),
  getReview: (id) => client.get(`/reviews/${id}/findings`).then((r) => r.data),
  getSeverityCounts: () => client.get('/analytics/severity').then((r) => r.data),

  getGithubStatus: () => client.get('/github/status').then((r) => r.data),
  getGithubRepos: () => client.get('/github/repos').then((r) => r.data),

  getTableNames: () => client.get('/tables').then((r) => r.data),
  getTable: (name) => client.get(`/tables/${name}`).then((r) => r.data),

  // payload: { code, fileName } for pasted code, or { files: [{ path, content }] } for uploads
  runQuickReview: (payload) => client.post('/quick-review', payload).then((r) => r.data),
  createPrFromReview: (reviewId, payload) =>
    client.post(`/quick-review/${reviewId}/create-pr`, payload).then((r) => r.data),
};

export default api;
