import axios from 'axios';

const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const CSRF_COOKIE_NAME = 'postera_csrf';
const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];

const api = axios.create({
  baseURL: DEFAULT_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

function getCookieValue(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

let csrfPromise = null;

async function ensureCsrfToken(baseUrl) {
  const cookieToken = getCookieValue(CSRF_COOKIE_NAME);
  if (cookieToken) {
    return cookieToken;
  }

  if (!csrfPromise) {
    csrfPromise = axios
      .get(`${baseUrl}/api/auth/csrf-token`, { withCredentials: true })
      .then((res) => res.data?.csrfToken || getCookieValue(CSRF_COOKIE_NAME))
      .catch(() => null)
      .finally(() => {
        csrfPromise = null;
      });
  }

  return csrfPromise;
}

api.interceptors.request.use(
  async (config) => {
    const method = (config.method || 'get').toLowerCase();
    if (MUTATING_METHODS.includes(method)) {
      const baseUrl = config.baseURL || DEFAULT_BASE_URL;
      const token = await ensureCsrfToken(baseUrl);
      if (token) {
        config.headers = config.headers || {};
        config.headers['x-csrf-token'] = token;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      const serverDetail = error.response.data?.detail || error.response.data?.message;
      if (serverDetail) {
        error.message = serverDetail;
      }
    }
    return Promise.reject(error);
  }
);

export default api;