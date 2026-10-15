import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,           // httpOnly JWT cookie
  timeout: 20000,
});

// Session expired -> let AuthContext clear the user (but not for the login/me probes themselves)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/me') && !url.startsWith('/auth/register')) {
      window.dispatchEvent(new Event('pw:unauthorized'));
    }
    return Promise.reject(err);
  }
);

/** Human-readable message from any axios error. */
export const errMsg = (err, fallback = 'Something went wrong. Please try again.') => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ECONNABORTED') return 'The server took too long to respond.';
  if (err?.message === 'Network Error') return 'Cannot reach the server. Check that the API is running.';
  return fallback;
};
/** Field -> message map from a 422 response, for inline form errors. */
export const fieldErrors = (err) => Object.fromEntries((err?.response?.data?.errors || []).map((e) => [e.field, e.message]));

const d = (p) => p.then((r) => r.data);
export const authApi = {
  login: (b) => d(api.post('/auth/login', b)), register: (b) => d(api.post('/auth/register', b)), logout: () => d(api.post('/auth/logout')),
  me: () => d(api.get('/auth/me')), updateProfile: (b) => d(api.put('/auth/me', b)), changePassword: (b) => d(api.put('/auth/password', b)),
};
export const tripApi = {
  list: () => d(api.get('/trips')), overview: () => d(api.get('/trips/stats/overview')), get: (id) => d(api.get(`/trips/${id}`)),
  create: (b) => d(api.post('/trips', b)), update: (id, b) => d(api.put(`/trips/${id}`, b)), remove: (id) => d(api.delete(`/trips/${id}`)),
  generate: (id, b = {}) => d(api.post(`/trips/${id}/itinerary/generate`, b)), modify: (id, b) => d(api.put(`/trips/${id}/itinerary`, b)),
  recommendations: (id) => d(api.get(`/trips/${id}/recommendations`)), analytics: (id) => d(api.get(`/trips/${id}/analytics`)), map: (id) => d(api.get(`/trips/${id}/map`)), recommendedPlaces: (id) => d(api.get(`/trips/${id}/recommended-places`)),
};
export const expenseApi = {
  forTrip: (tripId) => d(api.get(`/expenses/${tripId}`)), create: (b) => d(api.post('/expenses', b)),
  update: (id, b) => d(api.put(`/expenses/${id}`, b)), remove: (id) => d(api.delete(`/expenses/${id}`)),
};
export const placeApi = {
  list: (params) => d(api.get('/places', { params })), destinations: () => d(api.get('/places/destinations')), get: (id) => d(api.get(`/places/${id}`)),
  create: (b) => d(api.post('/places', b)), update: (id, b) => d(api.put(`/places/${id}`, b)), remove: (id) => d(api.delete(`/places/${id}`)),
};
export const weatherApi = { get: (destination, params) => d(api.get(`/weather/${encodeURIComponent(destination)}`, { params })) };
export const adminApi = {
  users: () => d(api.get('/admin/users')), trips: () => d(api.get('/admin/trips')), expenses: () => d(api.get('/admin/expenses')), stats: () => d(api.get('/admin/statistics')),
};
export default api;
