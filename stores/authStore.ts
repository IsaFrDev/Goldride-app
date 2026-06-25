import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, setLanguage } from '../services/i18n';

interface User {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
  role: 'passenger' | 'driver';
  avatar: string | null;
  language: Language;
  is_verified: boolean;
  has_driver_profile: boolean;
  id_number: number;
  referral_code: string;
  gold_points: number;
  bonus_balance: number;
  has_agreed_to_terms: boolean;
  total_passenger_rides: number;
  pending_referral_bonus: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  language: Language;
  isOnline: boolean;

  setTokens: (access: string, refresh: string) => void;
  setUser: (user: User) => void;
  setLanguage: (lang: Language) => void;
  login: (access: string, refresh: string, user: User) => void;
  logout: () => void;
  setIsOnline: (status: boolean) => void;
  loadStoredAuth: () => Promise<void>;
  referralCode: string | null;
  setReferralCode: (code: string) => void;
  onboardingRole: 'passenger' | 'driver' | null;
  setOnboardingRole: (role: 'passenger' | 'driver' | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
  isAuthenticated: false,
  language: 'uz',
  isOnline: false,
  referralCode: null,
  onboardingRole: null,

  setReferralCode: (code) => set({ referralCode: code }),
  setOnboardingRole: (role) => set({ onboardingRole: role }),

  setTokens: (access, refresh) => {
    set({ accessToken: access, refreshToken: refresh });
    AsyncStorage.setItem('access_token', access);
    AsyncStorage.setItem('refresh_token', refresh);
  },

  setUser: (user) => {
    set({ user, isAuthenticated: true });
    AsyncStorage.setItem('user', JSON.stringify(user));
  },

  setLanguage: (lang) => {
    set({ language: lang });
    setLanguage(lang);
    AsyncStorage.setItem('language', lang);
  },

  login: (access, refresh, user) => {
    set({
      accessToken: access,
      refreshToken: refresh,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
    AsyncStorage.setItem('access_token', access);
    AsyncStorage.setItem('refresh_token', refresh);
    AsyncStorage.setItem('user', JSON.stringify(user));
  },

  logout: () => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user', 'is_online']);
  },

  setIsOnline: (status) => {
    set({ isOnline: status });
    AsyncStorage.setItem('is_online', status ? 'true' : 'false');
  },

  loadStoredAuth: async () => {
    try {
      const [access, refresh, userStr, lang, isOnlineStr] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('refresh_token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('language'),
        AsyncStorage.getItem('is_online'),
      ]);

      if (lang) {
        setLanguage(lang as Language);
        set({ language: lang as Language });
      }

      if (isOnlineStr) {
        set({ isOnline: isOnlineStr === 'true' });
      }

      if (access && refresh && userStr) {
        const user = JSON.parse(userStr);
        set({
          accessToken: access,
          refreshToken: refresh,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },
}));
