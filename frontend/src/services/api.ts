import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

// Inject JWT on every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Redirect to login on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
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

// ─── Telemetry ───────────────────────────────────────────────────────────────
export const telemetryApi = {
  trips: (vehicleId: string, from?: string, to?: string) =>
    api.get(`/telemetry/trips/${vehicleId}`, { params: { from, to } }).then(r => r.data),
  kpi: (days = 30) => api.get('/telemetry/kpi', { params: { days } }).then(r => r.data),
};

// ─── Fuel ─────────────────────────────────────────────────────────────────────
export const fuelApi = {
  transactions: (from?: string, to?: string, vehicleId?: string) =>
    api.get('/fuel/transactions', { params: { from, to, vehicleId } }).then(r => r.data),
  fraudAlerts: (status?: string) =>
    api.get('/fuel/fraud-alerts', { params: { status } }).then(r => r.data),
  kpi: (days = 30) => api.get('/fuel/kpi', { params: { days } }).then(r => r.data),
};

// ─── Connectors ──────────────────────────────────────────────────────────────
export const connectorsApi = {
  positions: () => api.get('/connectors/webfleet/positions').then(r => r.data),
};

export default api;
