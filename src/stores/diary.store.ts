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
    updateDiaryEntry as updateDiaryEntryApi,
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
  updateEntry: (id: string, updates: Partial<DiaryEntry>, token?: string) => Promise<void>;
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

        // Auto-end any active fast when logging food with 5+ calories
        // (allows water, tea, coffee, etc. which are typically under 5 calories)
        const fastingState = useFastingStore.getState();
        const calories = entryData.nutrition?.calories ?? 0;
        if (fastingState.activeFastId && calories >= 5) {
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

      updateEntry: async (id, updates, token) => {
        const entry = Object.entries(get().entries).flatMap(([d, list]) =>
          list.map((e) => ({ ...e, date: d }))
        ).find((e) => e.id === id);
        const cloudKey = entry?.cloudEntryKey;
        const date = entry?.date;

        set((state) => {
          const newEntries = { ...state.entries };
          for (const d in newEntries) {
            const idx = newEntries[d].findIndex((e) => e.id === id);
            if (idx !== -1) {
              newEntries[d] = [...newEntries[d]];
              newEntries[d][idx] = {
                ...newEntries[d][idx],
                ...updates,
                updatedAt: getISOTimestamp(),
                synced: !!(token && cloudKey),
              };
              break;
            }
          }
          return { entries: newEntries };
        });

        if (token && cloudKey && date) {
          const payload: Record<string, unknown> = {};
          if (updates.servingId != null) payload.servingId = updates.servingId;
          if (updates.servingAmount != null) payload.servingAmount = updates.servingAmount;
          if (updates.servingUnit != null) payload.servingUnit = updates.servingUnit;
          if (updates.servingDescription != null) payload.servingDescription = updates.servingDescription;
          if (updates.nutrition != null) payload.nutrition = updates.nutrition;
          if (Object.keys(payload).length === 0) return;
          const res = await updateDiaryEntryApi(cloudKey, payload as any, token);
          if (res.error) {
            console.error('Failed to sync entry update to cloud:', res.error);
            set((state) => {
              const newEntries = { ...state.entries };
              for (const d in newEntries) {
                const idx = newEntries[d].findIndex((e) => e.id === id);
                if (idx !== -1) {
                  newEntries[d] = [...newEntries[d]];
                  newEntries[d][idx] = { ...newEntries[d][idx], synced: false };
                  break;
                }
              }
              return { entries: newEntries };
            });
          }
        }
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
            const cloudIds = new Set(cloudEntries.map((c) => c.id));

            set((state) => {
              const localEntries = state.entries[date] || [];
              const unsyncedLocal = localEntries.filter((e) => !e.synced);
              const editedLocal = unsyncedLocal.filter((e) => e.cloudEntryKey);
              const newLocal = unsyncedLocal.filter((e) => !e.cloudEntryKey);

              const fromCloud = cloudEntries.map((c) => {
                const local = editedLocal.find((l) => l.id === c.id);
                return local ?? c;
              });
              const added = newLocal.filter((l) => !cloudIds.has(l.id));
              const mergedEntries = [...fromCloud, ...added];

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

      // Sync all unsynced entries to cloud (create new, update edited)
      syncUnsyncedEntries: async (token) => {
        const { entries } = get();
        set({ isSyncing: true });

        try {
          for (const date in entries) {
            const unsyncedEntries = entries[date].filter((e) => !e.synced);

            for (const entry of unsyncedEntries) {
              if (entry.cloudEntryKey) {
                const payload: Record<string, unknown> = {};
                if (entry.servingId != null) payload.servingId = entry.servingId;
                if (entry.servingAmount != null) payload.servingAmount = entry.servingAmount;
                if (entry.servingUnit != null) payload.servingUnit = entry.servingUnit;
                if (entry.servingDescription != null) payload.servingDescription = entry.servingDescription;
                if (entry.nutrition != null) payload.nutrition = entry.nutrition;
                if (Object.keys(payload).length === 0) continue;
                const result = await updateDiaryEntryApi(entry.cloudEntryKey, payload as any, token);
                if (!result.error) {
                  set((state) => {
                    const dateEntries = state.entries[date] || [];
                    const idx = dateEntries.findIndex((e) => e.id === entry.id);
                    if (idx === -1) return state;
                    const updated = [...dateEntries];
                    updated[idx] = { ...updated[idx], synced: true };
                    return { entries: { ...state.entries, [date]: updated } };
                  });
                }
              } else {
                const cloudData = localToCloudEntry(entry);
                const result = await createDiaryEntry(cloudData as any, token);
                if (result.data) {
                  set((state) => {
                    const dateEntries = state.entries[date] || [];
                    const idx = dateEntries.findIndex((e) => e.id === entry.id);
                    if (idx === -1) return state;
                    const updated = [...dateEntries];
                    updated[idx] = { ...updated[idx], cloudEntryKey: result.data!.entryKey, synced: true };
                    return { entries: { ...state.entries, [date]: updated } };
                  });
                }
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
