import axios from 'axios';

export const TOKEN_KEY = 'nexachain.token';

const client = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the JWT to every request.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalise errors to { status, message, errors } and bounce to login on 401.
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = data?.message || (error.code === 'ECONNABORTED' ? 'Request timed out' : 'Network error - is the API running?');

    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('nexachain:unauthorized'));
    }
    return Promise.reject({ status, message, errors: data?.errors || [] });
  }
);

export default client;
