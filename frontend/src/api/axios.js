import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  withCredentials: true, 
  withXSRFToken: true,   
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

export const getCsrfCookie = async () => {
  await api.get('/sanctum/csrf-cookie');
};

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