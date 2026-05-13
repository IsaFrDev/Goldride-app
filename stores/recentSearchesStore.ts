import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecentSearch {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  timestamp: number;
}

interface RecentSearchesState {
  recent: RecentSearch[];
  addSearch: (search: Omit<RecentSearch, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
}

export const useRecentSearchesStore = create<RecentSearchesState>()(
  persist(
    (set) => ({
      recent: [],
      addSearch: (search) => set((state) => {
        const newSearch: RecentSearch = {
          ...search,
          id: `${search.lat}-${search.lng}`,
          timestamp: Date.now(),
        };
        
        // Dublikatlarni o'chirish
        const filtered = state.recent.filter(item => item.id !== newSearch.id);
        
        // Yangisini boshiga qo'shish va faqat faqat 3 tasini qoldirish
        const updated = [newSearch, ...filtered].slice(0, 3);
        
        return { recent: updated };
      }),
      clearHistory: () => set({ recent: [] }),
    }),
    {
      name: 'taksi-recent-searches',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
