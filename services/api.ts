import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/authStore';

// Production API URL — Railway backend
const PRODUCTION_API_URL = 'https://goldride-backend-production.up.railway.app/api';
// Local development fallback
const LOCAL_IP = '192.168.100.160';
const LOCAL_API_URL = `http://${LOCAL_IP}:8000/api`;

// Use production by default for APK builds
let API_BASE_URL = PRODUCTION_API_URL;

// Load saved URL on startup
export const loadApiUrl = async () => {
  try {
    const saved = await AsyncStorage.getItem('api_base_url');
    if (saved) {
      console.log('[API] Using saved URL:', saved);
      API_BASE_URL = saved;
      api.defaults.baseURL = saved;
    } else {
      console.log('[API] Using production URL:', PRODUCTION_API_URL);
    }
  } catch (e) {
    console.error('[API] Failed to load saved URL:', e);
  }
};

// Change the API URL from Settings
export const setApiUrl = async (url: string) => {
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http')) {
      cleanUrl = `http://${cleanUrl}`;
  }
  if (!cleanUrl.endsWith('/api') && !cleanUrl.endsWith('/api/')) {
      cleanUrl = cleanUrl.endsWith('/') ? `${cleanUrl}api` : `${cleanUrl}/api`;
  }
  if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);

  console.log('[API] Updating URL to:', cleanUrl);
  API_BASE_URL = cleanUrl;
  api.defaults.baseURL = cleanUrl;
  await AsyncStorage.setItem('api_base_url', cleanUrl);
};

export const getApiUrl = () => API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize on import
loadApiUrl();


// Request interceptor — add JWT token
api.interceptors.request.use(
  (config) => {
    const { accessToken, isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated && accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      // console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} (Token attached)`);
    } else {
      // console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} (No token attached)`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 (token refresh)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          console.log(`[API 401] Attempting token refresh for: ${originalRequest.url}`);
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          const { access } = response.data;
          console.log('[API Refresh] Token refreshed successfully');

          useAuthStore.getState().setTokens(access, refreshToken);
          originalRequest.headers.Authorization = `Bearer ${access}`;

          return api(originalRequest);
        } else {
          console.log('[API Refresh] No refresh token available');
        }
      } catch (refreshError) {
        console.log('[API Refresh] Token refresh failed, logging out...');
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  // Google (Firebase) — yagona kirish usuli
  // phone majburiy yangi foydalanuvchilar uchun
  sendOTP: (phone: string, method: 'telegram' | 'recaptcha', recaptchaToken?: string, ipAddress?: string) =>
    api.post('/auth/send-otp/', { phone, method, recaptcha_token: recaptchaToken, ip_address: ipAddress }),
  
  verifyOTP: (identifier: string, code: string, type: 'phone' | 'email', phone?: string, referralCode?: string, ipAddress?: string) =>
    api.post('/auth/verify-otp/', { identifier, code, otp: code, type, phone, referral_code: referralCode, ip_address: ipAddress }),

  register: (data: any) => api.post('/auth/register/', data),
  registerDriver: (data: FormData) =>
    api.post('/auth/register/driver/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getTaxiParks: () => api.get('/auth/taxi-park/list/'),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data: any) => api.put('/auth/profile/', data),
  submitReferralCode: (referralCode: string) => api.post('/auth/profile/submit-referral/', { referral_code: referralCode }),
  getDriverProfile: () => api.get('/auth/driver/profile/'),
  toggleDriverStatus: (data?: any) =>
    api.post('/auth/driver/toggle-status/', data || {}),
  updateLocation: (lat: number, lng: number) =>
    api.post('/auth/driver/location/', { lat, lng }),
  getNearbyDrivers: () => api.get('/auth/drivers/nearby/'),
  getWallet: () => api.get('/auth/wallet/'),
  depositWallet: (amount: number) => api.post('/auth/wallet/deposit/', { amount }),
  getWalletRequests: () => api.get('/auth/wallet/requests/'),
  createWalletRequest: (data: { request_type: 'deposit' | 'withdraw', amount: number }) =>
    api.post('/auth/wallet/requests/', data),
  // Referal daromadlar — kimdan qancha bonus tushgani (o'z keshbegidan alohida)
  getReferralEarnings: () => api.get('/auth/referral/earnings/'),
  withdrawReferral: (amount: number) => api.post('/auth/wallet/withdraw-referral/', { amount }),
};

// Rides API
export const ridesAPI = {
  estimatePrice: (data: {
    pickup_lat: number;
    pickup_lng: number;
    drop_lat: number;
    drop_lng: number;
    share_type?: string;
    is_shared?: boolean;
    is_scheduled?: boolean;
    stops_count?: number;
  }) => api.post('/rides/estimate/', data),

  requestRide: (data: {
    pickup_lat: number;
    pickup_lng: number;
    pickup_address?: string;
    drop_lat: number;
    drop_lng: number;
    drop_address?: string;
    car_category?: string;
    payment_method?: 'cash' | 'card' | 'bonus';
    is_shared?: boolean;
    share_type?: string;
    use_bonus?: boolean;
    bonus_percent?: number;
    is_scheduled?: boolean;
    scheduled_time?: string;
    stops?: Array<{ address: string; latitude: number; longitude: number; order: number }>;
  }) => api.post('/rides/request/', data),

  acceptRide: (rideId: number) => api.post(`/rides/${rideId}/accept/`),
  markArrived: (rideId: number) => api.post(`/rides/${rideId}/mark-arrived/`),
  cancelRide: (rideId: number) => api.post(`/rides/${rideId}/cancel/`),
  startRide: (rideId: number) => api.post(`/rides/${rideId}/start/`),
  completeRide: (rideId: number) => api.post(`/rides/${rideId}/complete/`),
  rateRide: (rideId: number, rating: number, comment?: string) =>
    api.post(`/rides/${rideId}/rate/`, { rating, comment }),

  getHistory: () => api.get('/rides/history/'),
  getActiveRides: () => api.get('/rides/driver/active/'),
  getActiveRide: () => api.get('/rides/active/'),
  getEarnings: () => api.get('/rides/driver/earnings/'),
  getRequestStatus: (requestId: number) => api.get(`/rides/requests/${requestId}/status/`),
  pickupPassenger: (rideId: number, passengerId: number) => api.post(`/rides/${rideId}/pickup/${passengerId}/`),
  dropoffPassenger: (rideId: number, passengerId: number) => api.post(`/rides/${rideId}/dropoff/${passengerId}/`),

  // Favorites
  toggleFavorite: (driverId: number) => api.post(`/rides/drivers/${driverId}/favorite/`),
  getFavorites: () => api.get('/rides/drivers/favorites/'),

  // Chat
  getChatMessages: (rideId: number) => api.get(`/rides/${rideId}/chat/`),
  getChatHistory: (rideId: number) => api.get(`/rides/${rideId}/chat-history/`),
  triggerSOS: (data: { latitude: number, longitude: number, ride_id?: number }) =>
    api.post('/rides/sos/', data),
  sendMessage: (rideId: number, content: string) => api.post(`/rides/${rideId}/chat/`, { content }),

  // Happy Hours
  getHappyHours: () => api.get('/rides/happy-hours/'),

  // Nearby drivers
  getNearbyDrivers: (lat: number, lng: number) => api.get(`/auth/drivers/nearby/?lat=${lat}&lng=${lng}`),
};

export const savedLocationsAPI = {
  getAll: () => api.get('/auth/locations/'),
  create: (data: { name: string; address: string; latitude: number; longitude: number; icon: string }) =>
    api.post('/auth/locations/', data),
  remove: (id: number) => api.delete(`/auth/locations/${id}/`),
};

export default api;
