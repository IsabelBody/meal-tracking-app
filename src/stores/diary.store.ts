import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
    cloudToLocalEntry,
    createDiaryEntry,
    deleteDiaryEntry,
    getDiaryEntries,
    localToCloudEntry,
} from '../services/api/diary';
import {
    DiaryEntry,
    MealType,
    Nutrition,
} from '../types';
import { formatDateKey, getISOTimestamp, getTodayKey } from '../utils/date';
import { sumNutrition } from '../utils/nutrition';
import { useFastingStore } from './fasting.store';

// Stable empty array reference to avoid infinite re-renders
const EMPTY_ENTRIES: DiaryEntry[] = [];

interface DiaryState {
  // Data
  entries: Record<string, DiaryEntry[]>; // Keyed by date (YYYY-MM-DD)
  selectedDate: string;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncedAt: string | null;

  // Actions
  setSelectedDate: (date: string | Date) => void;
  addEntry: (entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>, token?: string) => Promise<DiaryEntry>;
  updateEntry: (id: string, updates: Partial<DiaryEntry>) => void;
  deleteEntry: (id: string, date: string, token?: string) => Promise<void>;
  copyMeal: (fromDate: string, toDate: string, mealType: MealType) => void;
  clearDay: (date: string) => void;

  // Cloud sync actions
  syncEntriesForDate: (date: string, token: string) => Promise<void>;
  syncUnsyncedEntries: (token: string) => Promise<void>;

  // Selectors (computed-like functions)
  getEntriesForDate: (date: string) => DiaryEntry[];
  getEntriesForMeal: (date: string, mealType: MealType) => DiaryEntry[];
  getDayTotals: (date: string) => Nutrition;
  getMealTotals: (date: string, mealType: MealType) => Nutrition;
}

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set, get) => ({
      // Initial state
      entries: {},
      selectedDate: getTodayKey(),
      isLoading: false,
      isSyncing: false,
      error: null,
      lastSyncedAt: null,

      // Actions
      setSelectedDate: (date) => {
        const dateKey = typeof date === 'string' ? date : formatDateKey(date);
        set({ selectedDate: dateKey });
      },

      addEntry: async (entryData, token) => {
        const id = uuidv4();
        const timestamp = getISOTimestamp();
        const newEntry: DiaryEntry = {
          ...entryData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
          synced: false,
        };

        // Auto-end any active fast when logging food
        const fastingState = useFastingStore.getState();
        if (fastingState.activeFastId) {
          fastingState.endFast(timestamp);
        }

        // Add to local state immediately (optimistic update)
        set((state) => {
          const dateEntries = state.entries[entryData.date] || [];
          return {
            entries: {
              ...state.entries,
              [entryData.date]: [...dateEntries, newEntry],
            },
          };
        });

        // Sync to cloud if authenticated
        if (token) {
          try {
            const cloudData = localToCloudEntry(entryData);
            const result = await createDiaryEntry(cloudData as any, token);
            
            if (result.data) {
              // Update local entry with cloud data
              set((state) => {
                const dateEntries = state.entries[entryData.date] || [];
                const index = dateEntries.findIndex((e) => e.id === id);
                if (index !== -1) {
                  const updatedEntries = [...dateEntries];
                  updatedEntries[index] = {
                    ...updatedEntries[index],
                    cloudEntryKey: result.data!.entryKey,
                    synced: true,
                  };
                  return {
                    entries: {
                      ...state.entries,
                      [entryData.date]: updatedEntries,
                    },
                  };
                }
                return state;
              });
            }
          } catch (error) {
            console.error('Failed to sync entry to cloud:', error);
            // Entry remains local with synced: false
          }
        }

        return newEntry;
      },

      updateEntry: (id, updates) => {
        set((state) => {
          const newEntries = { ...state.entries };
          
          for (const date in newEntries) {
            const index = newEntries[date].findIndex((e) => e.id === id);
            if (index !== -1) {
              newEntries[date] = [...newEntries[date]];
              newEntries[date][index] = {
                ...newEntries[date][index],
                ...updates,
                updatedAt: getISOTimestamp(),
                synced: false, // Mark as needing sync
              };
              break;
            }
          }

          return { entries: newEntries };
        });
      },

      deleteEntry: async (id, date, token) => {
        const entry = get().entries[date]?.find((e) => e.id === id);
        
        // Remove from local state immediately
        set((state) => {
          const dateEntries = state.entries[date];
          if (!dateEntries) return state;

          return {
            entries: {
              ...state.entries,
              [date]: dateEntries.filter((e) => e.id !== id),
            },
          };
        });

        // Delete from cloud if authenticated and entry was synced
        if (token && entry?.cloudEntryKey) {
          try {
            await deleteDiaryEntry(entry.cloudEntryKey, token);
          } catch (error) {
            console.error('Failed to delete entry from cloud:', error);
          }
        }
      },

      copyMeal: (fromDate, toDate, mealType) => {
        const { entries, addEntry } = get();
        const sourceEntries = entries[fromDate]?.filter(
          (e) => e.mealType === mealType
        );

        if (!sourceEntries || sourceEntries.length === 0) return;

        sourceEntries.forEach((entry) => {
          addEntry({
            ...entry,
            date: toDate,
          });
        });
      },

      clearDay: (date) => {
        set((state) => {
          const newEntries = { ...state.entries };
          delete newEntries[date];
          return { entries: newEntries };
        });
      },

      // Cloud sync: fetch entries from cloud and merge with local
      syncEntriesForDate: async (date, token) => {
        set({ isSyncing: true, error: null });
        
        try {
          const result = await getDiaryEntries(date, token);
          
          if (result.error) {
            set({ error: result.error, isSyncing: false });
            return;
          }

          if (result.data?.entries) {
            const cloudEntries = result.data.entries.map(cloudToLocalEntry);
            
            set((state) => {
              const localEntries = state.entries[date] || [];
              // Get local entries that aren't synced (new local entries)
              const unsyncedLocal = localEntries.filter((e) => !e.synced);
              
              // Merge: cloud entries + unsynced local entries
              const mergedEntries = [
                ...cloudEntries,
                ...unsyncedLocal.filter(
                  (local) => !cloudEntries.some((cloud) => cloud.id === local.id)
                ),
              ];

              return {
                entries: {
                  ...state.entries,
                  [date]: mergedEntries,
                },
                lastSyncedAt: getISOTimestamp(),
                isSyncing: false,
              };
            });
          } else {
            set({ isSyncing: false });
          }
        } catch (error: any) {
          set({ error: error.message || 'Sync failed', isSyncing: false });
        }
      },

      // Sync all unsynced entries to cloud
      syncUnsyncedEntries: async (token) => {
        const { entries } = get();
        set({ isSyncing: true });

        try {
          for (const date in entries) {
            const unsyncedEntries = entries[date].filter((e) => !e.synced);
            
            for (const entry of unsyncedEntries) {
              const cloudData = localToCloudEntry(entry);
              const result = await createDiaryEntry(cloudData as any, token);
              
              if (result.data) {
                set((state) => {
                  const dateEntries = state.entries[date] || [];
                  const index = dateEntries.findIndex((e) => e.id === entry.id);
                  if (index !== -1) {
                    const updatedEntries = [...dateEntries];
                    updatedEntries[index] = {
                      ...updatedEntries[index],
                      cloudEntryKey: result.data!.entryKey,
                      synced: true,
                    };
                    return {
                      entries: {
                        ...state.entries,
                        [date]: updatedEntries,
                      },
                    };
                  }
                  return state;
                });
              }
            }
          }
          
          set({ lastSyncedAt: getISOTimestamp(), isSyncing: false });
        } catch (error: any) {
          set({ error: error.message || 'Sync failed', isSyncing: false });
        }
      },

      // Selectors
      getEntriesForDate: (date) => {
        return get().entries[date] || [];
      },

      getEntriesForMeal: (date, mealType) => {
        return (get().entries[date] || []).filter(
          (e) => e.mealType === mealType
        );
      },

      getDayTotals: (date) => {
        const entries = get().entries[date] || [];
        return sumNutrition(entries);
      },

      getMealTotals: (date, mealType) => {
        const entries = (get().entries[date] || []).filter(
          (e) => e.mealType === mealType
        );
        return sumNutrition(entries);
      },
    }),
    {
      name: 'meal-tracker-diary',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        entries: state.entries,
        selectedDate: state.selectedDate,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);

// Helper hooks for common operations
export function useTodayEntries() {
  const today = getTodayKey();
  return useDiaryStore((state) => state.entries[today] ?? EMPTY_ENTRIES);
}

export function useTodayTotals() {
  const entries = useTodayEntries();
  return useMemo(() => sumNutrition(entries), [entries]);
}

export function useSelectedDateEntries() {
  return useDiaryStore((state) => state.entries[state.selectedDate] ?? EMPTY_ENTRIES);
}

// Hook to get entries for a specific date with stable reference
export function useDateEntries(date: string) {
  return useDiaryStore((state) => state.entries[date] ?? EMPTY_ENTRIES);
}
