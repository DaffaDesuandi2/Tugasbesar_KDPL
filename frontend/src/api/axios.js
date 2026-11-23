import axios from 'axios';

let savedCsrfToken = null;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const mutating = ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase());
  if (mutating) {
    if (!savedCsrfToken) {
      try {
        const baseUrl = config.baseURL || 'http://localhost:8000';
        const res = await axios.get(`${baseUrl}/api/auth/csrf-token`, { withCredentials: true });
        if (res.data?.csrfToken) {
          savedCsrfToken = res.data.csrfToken;
        }
      } catch (err) {
        // Abaikan jika endpoint token belum siap
      }
    }
    if (savedCsrfToken) {
      config.headers['x-csrf-token'] = savedCsrfToken;
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
