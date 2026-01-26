import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { WeightEntry, WeightUnit } from '../types/weight';
import { formatDateKey, getISOTimestamp, getTodayKey } from '../utils/date';

interface WeightState {
  // Data
  entries: Record<string, WeightEntry>; // Keyed by date (YYYY-MM-DD) - one entry per day
  selectedDate: string;
  preferredUnit: WeightUnit;

  // Actions
  setSelectedDate: (date: string | Date) => void;
  setPreferredUnit: (unit: WeightUnit) => void;
  logWeight: (weight: number, unit: WeightUnit, notes?: string) => WeightEntry;
  updateWeight: (date: string, weight: number, unit: WeightUnit, notes?: string) => void;
  deleteWeight: (date: string) => void;
  getEntryForDate: (date: string) => WeightEntry | undefined;
}

export const useWeightStore = create<WeightState>()(
  persist(
    (set, get) => ({
      // Initial state
      entries: {},
      selectedDate: getTodayKey(),
      preferredUnit: 'lbs',

      // Actions
      setSelectedDate: (date) => {
        const dateKey = typeof date === 'string' ? date : formatDateKey(date);
        set({ selectedDate: dateKey });
      },

      setPreferredUnit: (unit) => {
        set({ preferredUnit: unit });
      },

      logWeight: (weight, unit, notes) => {
        const { selectedDate, entries } = get();
        const timestamp = getISOTimestamp();

        // Check if entry already exists for this date
        const existingEntry = entries[selectedDate];
        if (existingEntry) {
          // Update existing entry
          const updatedEntry: WeightEntry = {
            ...existingEntry,
            weight,
            unit,
            notes,
            updatedAt: timestamp,
          };

          set((state) => ({
            entries: {
              ...state.entries,
              [selectedDate]: updatedEntry,
            },
          }));

          return updatedEntry;
        }

        // Create new entry
        const newEntry: WeightEntry = {
          id: uuidv4(),
          date: selectedDate,
          weight,
          unit,
          notes,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        set((state) => ({
          entries: {
            ...state.entries,
            [selectedDate]: newEntry,
          },
        }));

        return newEntry;
      },

      updateWeight: (date, weight, unit, notes) => {
        const { entries } = get();
        const existingEntry = entries[date];
        if (!existingEntry) return;

        const updatedEntry: WeightEntry = {
          ...existingEntry,
          weight,
          unit,
          notes,
          updatedAt: getISOTimestamp(),
        };

        set((state) => ({
          entries: {
            ...state.entries,
            [date]: updatedEntry,
          },
        }));
      },

      deleteWeight: (date) => {
        set((state) => {
          const newEntries = { ...state.entries };
          delete newEntries[date];
          return { entries: newEntries };
        });
      },

      getEntryForDate: (date) => {
        return get().entries[date];
      },
    }),
    {
      name: 'meal-tracker-weight',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        entries: state.entries,
        selectedDate: state.selectedDate,
        preferredUnit: state.preferredUnit,
      }),
    }
  )
);

// Helper hook to get entry for selected date
export function useSelectedDateWeight() {
  return useWeightStore((state) => state.entries[state.selectedDate]);
}

// Helper hook to get entry for a specific date
export function useDateWeight(date: string) {
  return useWeightStore((state) => state.entries[date]);
}
