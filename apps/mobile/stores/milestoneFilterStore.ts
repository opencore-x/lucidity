import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store adapter for zustand's persist middleware (async getItem/setItem).
const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

interface MilestoneFilterState {
  // The Milestones screen's project filter (null = "All"). Persisted so reopening the
  // screen restores the last selection instead of defaulting back to All.
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
}

export const useMilestoneFilterStore = create<MilestoneFilterState>()(
  persist(
    (set) => ({
      selectedProjectId: null,
      setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
    }),
    {
      name: 'lucidity-milestone-filter',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
