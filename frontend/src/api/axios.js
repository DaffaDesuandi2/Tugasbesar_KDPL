import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  withCredentials: true,
  xsrfCookieName: 'postera_csrf',
  xsrfHeaderName: 'x-csrf-token',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

let csrfPromise = null;

api.interceptors.request.use(async (config) => {
  const mutating = ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase());
  if (mutating && typeof document !== 'undefined') {
    const hasCookie = document.cookie.split('; ').some((c) => c.startsWith('postera_csrf='));
    if (!hasCookie) {
      if (!csrfPromise) {
        const baseUrl = config.baseURL || 'http://localhost:8000';
        csrfPromise = axios
          .get(`${baseUrl}/api/auth/csrf-token`, { withCredentials: true })
          .finally(() => {
            csrfPromise = null;
          });
      }
      try {
        const res = await csrfPromise;
        if (res?.data?.csrfToken) {
          config.headers['x-csrf-token'] = res.data.csrfToken;
        }
      } catch (err) {
        // Biarkan request lanjut jika gagal fetch token
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
