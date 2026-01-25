import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NutritionGoals, DEFAULT_GOALS } from '../types';

interface UserProfile {
  name?: string;
  email?: string;
  unitSystem: 'metric' | 'imperial';
  createdAt?: string;
}

interface GoalsState {
  // Data
  goals: NutritionGoals;
  profile: UserProfile;

  // Actions
  updateGoals: (updates: Partial<NutritionGoals>) => void;
  resetGoals: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setCalorieGoal: (calories: number) => void;
  setMacroGoals: (protein: number, carbs: number, fat: number) => void;
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      // Initial state
      goals: DEFAULT_GOALS,
      profile: {
        unitSystem: 'metric',
      },

      // Actions
      updateGoals: (updates) => {
        set((state) => ({
          goals: {
            ...state.goals,
            ...updates,
          },
        }));
      },

      resetGoals: () => {
        set({ goals: DEFAULT_GOALS });
      },

      updateProfile: (updates) => {
        set((state) => ({
          profile: {
            ...state.profile,
            ...updates,
          },
        }));
      },

      setCalorieGoal: (calories) => {
        set((state) => ({
          goals: {
            ...state.goals,
            calories,
          },
        }));
      },

      setMacroGoals: (protein, carbs, fat) => {
        set((state) => ({
          goals: {
            ...state.goals,
            protein,
            carbs,
            fat,
          },
        }));
      },
    }),
    {
      name: 'meal-tracker-goals',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Helper hook to get remaining macros
export function useRemainingNutrition(currentTotals: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  const goals = useGoalsStore((state) => state.goals);
  
  return {
    calories: Math.max(0, goals.calories - currentTotals.calories),
    protein: Math.max(0, goals.protein - currentTotals.protein),
    carbs: Math.max(0, goals.carbs - currentTotals.carbs),
    fat: Math.max(0, goals.fat - currentTotals.fat),
  };
}

// Helper hook to get progress percentages
export function useNutritionProgress(currentTotals: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  const goals = useGoalsStore((state) => state.goals);

  const calculatePercent = (current: number, goal: number) => {
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((current / goal) * 100));
  };

  return {
    calories: calculatePercent(currentTotals.calories, goals.calories),
    protein: calculatePercent(currentTotals.protein, goals.protein),
    carbs: calculatePercent(currentTotals.carbs, goals.carbs),
    fat: calculatePercent(currentTotals.fat, goals.fat),
  };
}
