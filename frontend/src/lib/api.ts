import axios from 'axios';
import { clearAuth, getAuth, setAuth } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: false
});

api.interceptors.request.use((config) => {
  const auth = getAuth();
  if (auth.accessToken) {
    config.headers = config.headers || new axios.AxiosHeaders();
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  // JS challenge header for bot middleware
  config.headers = config.headers || new axios.AxiosHeaders();
  (config.headers as any)['x-js-ok'] = '1';
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      const auth = getAuth();
      if (!auth.refreshToken) {
        clearAuth();
        return Promise.reject(error);
      }
      if (!refreshing) {
        refreshing = refreshAccessToken(auth.refreshToken)
          .finally(() => { refreshing = null; });
      }
      const newAccess = await refreshing;
      if (newAccess) {
        const cfg = error.config;
        cfg.headers.Authorization = `Bearer ${newAccess}`;
        return api(cfg);
      }
    }
    return Promise.reject(error);
  }
);

async function refreshAccessToken (refreshToken: string): Promise<string | null> {
  try {
    const r = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
    const auth = getAuth();
    const next = { ...auth, accessToken: r.data.accessToken };
    setAuth(next);
    return r.data.accessToken as string;
  } catch {
    clearAuth();
    return null;
  }
}

export async function login (email: string, password: string) {
  const r = await axios.post(`${API_BASE}/api/auth/login`, { email, password }, { headers: { 'x-js-ok': '1' } });
  setAuth({ user: r.data.user, accessToken: r.data.accessToken, refreshToken: r.data.refreshToken });
  return r.data;
}

export async function signup (email: string, password: string) {
  await axios.post(`${API_BASE}/api/auth/signup`, { email, password }, { headers: { 'x-js-ok': '1' } });
  return login(email, password);
}

export async function logout () {
  const auth = getAuth();
  if (auth.refreshToken) {
    await axios.post(`${API_BASE}/api/auth/logout`, { refreshToken: auth.refreshToken });
  }
  clearAuth();
}

// Payment API functions
export async function initiatePayment (paymentData: {
  platform: string;
  ticketId: string;
  amount: number;
  currency?: string;
  paymentMethod: string;
}) {
  const r = await api.post('/payment/initiate', paymentData);
  return r.data;
}

export async function processPayment (transactionId: string, verificationData?: any) {
  const r = await api.post('/payment/process', { transactionId, verificationData });
  return r.data;
}

export async function getPaymentStatus (transactionId: string) {
  const r = await api.get(`/payment/status/${transactionId}`);
  return r.data;
}

export async function getPaymentHistory (page = 1, limit = 10, platform?: string) {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (platform) params.append('platform', platform);
  const r = await api.get(`/payment/history?${params}`);
  return r.data;
}



