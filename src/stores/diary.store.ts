import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import {
  DiaryEntry,
  MealType,
  Nutrition,
  NutritionGoals,
  DEFAULT_GOALS,
} from '../types';
import { getTodayKey, formatDateKey, getISOTimestamp } from '../utils/date';
import { sumNutrition, calculateRemaining } from '../utils/nutrition';

interface DiaryState {
  // Data
  entries: Record<string, DiaryEntry[]>; // Keyed by date (YYYY-MM-DD)
  selectedDate: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSelectedDate: (date: string | Date) => void;
  addEntry: (entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) => DiaryEntry;
  updateEntry: (id: string, updates: Partial<DiaryEntry>) => void;
  deleteEntry: (id: string, date: string) => void;
  copyMeal: (fromDate: string, toDate: string, mealType: MealType) => void;
  clearDay: (date: string) => void;

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
      error: null,

      // Actions
      setSelectedDate: (date) => {
        const dateKey = typeof date === 'string' ? date : formatDateKey(date);
        set({ selectedDate: dateKey });
      },

      addEntry: (entryData) => {
        const id = uuidv4();
        const timestamp = getISOTimestamp();
        const newEntry: DiaryEntry = {
          ...entryData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        set((state) => {
          const dateEntries = state.entries[entryData.date] || [];
          return {
            entries: {
              ...state.entries,
              [entryData.date]: [...dateEntries, newEntry],
            },
          };
        });

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
              };
              break;
            }
          }

          return { entries: newEntries };
        });
      },

      deleteEntry: (id, date) => {
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
      }),
    }
  )
);

// Helper hooks for common operations
export function useTodayEntries() {
  const today = getTodayKey();
  return useDiaryStore((state) => state.entries[today] || []);
}

export function useTodayTotals() {
  const today = getTodayKey();
  return useDiaryStore((state) => {
    const entries = state.entries[today] || [];
    return sumNutrition(entries);
  });
}

export function useSelectedDateEntries() {
  return useDiaryStore((state) => state.entries[state.selectedDate] || []);
}
