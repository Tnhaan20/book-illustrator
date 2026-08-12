// src/api/axios.ts — singleton Axios instance
// All services import this. The x-user-id header is injected automatically
// via a request interceptor so every service call is authenticated.

import axios from 'axios';

// Do NOT set a default Content-Type here.
// Axios auto-sets 'application/json' for plain objects
// and 'multipart/form-data; boundary=...' for FormData.
// A hardcoded default overwrites the boundary, breaking multer file parsing.
const api = axios.create({
  baseURL: '/api',
});

// Inject stored user-id before every request
api.interceptors.request.use((config) => {
  const userId = localStorage.getItem('userId');
  if (userId) config.headers['x-user-id'] = userId;
  return config;
});

export default api;
