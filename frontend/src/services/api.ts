import axios from 'axios';

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || ''}/api/v1` });

// Inject JWT on every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// On ne redirige plus vers /login sur 401 des endpoints de données
// Les pages gèrent l'erreur avec retry:false + isError (bannière jaune)
api.interceptors.response.use(
  r => r,
  err => Promise.reject(err),
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
};

// ─── Fleet ───────────────────────────────────────────────────────────────────
export const fleetApi = {
  vehicles: () => api.get('/fleet/vehicles').then(r => r.data),
  vehicle: (id: string) => api.get(`/fleet/vehicles/${id}`).then(r => r.data),
  drivers: () => api.get('/fleet/drivers').then(r => r.data),
  stats: () => api.get('/fleet/stats').then(r => r.data),
};

// ─── Fuel ────────────────────────────────────────────────────────────────────
export const fuelApi = {
  transactions: () => api.get('/fuel/transactions').then(r => r.data),
  kpi: () => api.get('/fuel/kpi').then(r => r.data),
};

// ─── Alerts ──────────────────────────────────────────────────────────────────
export const alertsApi = {
  list: () => api.get('/alerts').then(r => r.data),
};

// ─── Map ─────────────────────────────────────────────────────────────────────
export const mapApi = {
  positions: () => api.get('/map/positions').then(r => r.data),
};

export default api;
