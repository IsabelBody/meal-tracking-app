import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { NutritionGoals, DEFAULT_GOALS } from '../types';
import { getGoals, updateGoals as updateGoalsApi } from '../services/api/diary';
import {
  Gender,
  ActivityLevel,
  WeightGoal,
  BodyStats,
} from '../utils/nutrition';

interface UserProfile {
  name?: string;
  email?: string;
  unitSystem: 'metric' | 'imperial';
  createdAt?: string;
  // Body stats for TDEE calculation
  gender?: Gender;
  weight?: number; // stored in kg
  height?: number; // stored in cm
  age?: number;
  activityLevel?: ActivityLevel;
  weightGoal?: WeightGoal;
}

interface GoalsState {
  // Data
  goals: NutritionGoals;
  profile: UserProfile;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;

  // Actions
  updateGoals: (updates: Partial<NutritionGoals>, token?: string) => Promise<void>;
  resetGoals: () => void;
  updateProfile: (updates: Partial<UserProfile>, token?: string) => void | Promise<void>;
  setCalorieGoal: (calories: number, token?: string) => Promise<void>;
  setMacroGoals: (protein: number, carbs: number, fat: number, token?: string) => Promise<void>;
  clearError: () => void;
  
  // Cloud sync actions
  syncGoals: (token: string) => Promise<void>;
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      // Initial state
      goals: DEFAULT_GOALS,
      profile: {
        unitSystem: 'metric',
        height: 169.5,
        age: 22,
        activityLevel: 'sedentary',
      },
      isSyncing: false,
      lastSyncedAt: null,
      error: null,

      // Actions
      updateGoals: async (updates, token) => {
        // Update locally first (optimistic)
        set((state) => ({
          goals: {
            ...state.goals,
            ...updates,
          },
          error: null,
        }));

        if (token) {
          const res = await updateGoalsApi({ goals: get().goals }, token);
          if (res.error) {
            console.error('Failed to sync goals to cloud:', res.error);
            set({ error: res.error });
          } else {
            set({ lastSyncedAt: new Date().toISOString() });
          }
        }
      },

      clearError: () => {
        set({ error: null });
      },

      resetGoals: () => {
        set({ goals: DEFAULT_GOALS });
      },

      updateProfile: async (updates, token) => {
        set((state) => ({
          profile: {
            ...state.profile,
            ...updates,
          },
        }));

        if (token) {
          const res = await updateGoalsApi(
            { profile: { ...get().profile, ...updates } },
            token
          );
          if (res.error) {
            console.error('Failed to sync profile to cloud:', res.error);
          } else {
            set({ lastSyncedAt: new Date().toISOString() });
          }
        }
      },

      setCalorieGoal: async (calories, token) => {
        set((state) => ({
          goals: {
            ...state.goals,
            calories,
          },
        }));

        if (token) {
          const res = await updateGoalsApi({ goals: get().goals }, token);
          if (res.error) console.error('Failed to sync goals to cloud:', res.error);
          else set({ lastSyncedAt: new Date().toISOString() });
        }
      },

      setMacroGoals: async (protein, carbs, fat, token) => {
        set((state) => ({
          goals: {
            ...state.goals,
            protein,
            carbs,
            fat,
          },
        }));

        if (token) {
          const res = await updateGoalsApi({ goals: get().goals }, token);
          if (res.error) console.error('Failed to sync goals to cloud:', res.error);
          else set({ lastSyncedAt: new Date().toISOString() });
        }
      },

      // Sync goals and profile from cloud
      syncGoals: async (token) => {
        set({ isSyncing: true, error: null });

        try {
          const result = await getGoals(token);

          if (result.error) {
            set({ error: result.error, isSyncing: false });
            return;
          }

          const data = result.data;
          if (data) {
            set({
              goals: {
                calories: data.goals.calories,
                protein: data.goals.protein,
                carbs: data.goals.carbs,
                fat: data.goals.fat,
                fiber: data.goals.fiber,
                sugar: data.goals.sugar,
                sodium: data.goals.sodium,
              },
              profile: { ...get().profile, ...data.profile },
              lastSyncedAt: new Date().toISOString(),
              isSyncing: false,
              error: null,
            });
          } else {
            set({ isSyncing: false });
          }
        } catch (error: any) {
          const message = error?.message || 'Failed to sync goals';
          console.error('Failed to sync goals from cloud:', error);
          set({ error: message, isSyncing: false });
        }
      },
    }),
    {
      name: 'meal-tracker-goals',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        goals: state.goals,
        profile: state.profile,
        lastSyncedAt: state.lastSyncedAt,
      }),
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
  
  return useMemo(() => ({
    calories: Math.max(0, goals.calories - currentTotals.calories),
    protein: Math.max(0, goals.protein - currentTotals.protein),
    carbs: Math.max(0, goals.carbs - currentTotals.carbs),
    fat: Math.max(0, goals.fat - currentTotals.fat),
  }), [
    goals.calories,
    goals.protein,
    goals.carbs,
    goals.fat,
    currentTotals.calories,
    currentTotals.protein,
    currentTotals.carbs,
    currentTotals.fat,
  ]);
}

// Helper hook to get progress percentages
export function useNutritionProgress(currentTotals: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  const goals = useGoalsStore((state) => state.goals);

  return useMemo(() => {
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
  }, [
    goals.calories,
    goals.protein,
    goals.carbs,
    goals.fat,
    currentTotals.calories,
    currentTotals.protein,
    currentTotals.carbs,
    currentTotals.fat,
  ]);
}
