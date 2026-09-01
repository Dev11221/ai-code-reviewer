import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

export const api = {
  getReviews: () => client.get('/reviews').then((r) => r.data),
  getReview: (id) => client.get(`/reviews/${id}/findings`).then((r) => r.data),
  deleteReview: (id) => client.delete(`/reviews/${id}`).then((r) => r.data),
  getSeverityCounts: () => client.get('/analytics/severity').then((r) => r.data),
  getGithubStatus: () => client.get('/github/status').then((r) => r.data),
  getGithubRepos: () => client.get('/github/repos').then((r) => r.data),
  getTableNames: () => client.get('/tables').then((r) => r.data),
  getTable: (name) => client.get(`/tables/${name}`).then((r) => r.data),
};

export default api;
