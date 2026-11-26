import axios from 'axios';

const TOKEN = 'examgen.token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN),
  set: (t) => localStorage.setItem(TOKEN, t),
  clear: () => localStorage.removeItem(TOKEN),
};

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', timeout: 60000 });
// AI calls can take several batches, and free hosting may need time to wake up
export const AI = { timeout: 600000 };

api.interceptors.request.use((c) => {
  const t = tokenStore.get();
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401 && !error.config.url.startsWith('/auth/login')) {
    tokenStore.clear();
    window.dispatchEvent(new Event('auth:expired'));
  }
  return Promise.reject(error);
});

export const errorMessage = (e) =>
  e.response?.data?.message ||
  (e.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Could not reach the server. Check your connection and try again.');
