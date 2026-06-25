import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (original.url.includes('/login')) return Promise.reject(err);
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        const { data } = await axios.post('/api/auth/admin/refresh', { refreshToken });
        localStorage.setItem('adminToken', data.data.accessToken);
        localStorage.setItem('adminRefreshToken', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
        localStorage.removeItem('admin');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
