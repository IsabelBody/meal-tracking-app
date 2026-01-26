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
  updateProfile: (updates: Partial<UserProfile>) => void;
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

        // Sync to cloud if authenticated
        if (token) {
          try {
            const currentGoals = get().goals;
            await updateGoalsApi(currentGoals, token);
            set({ lastSyncedAt: new Date().toISOString() });
          } catch (error: any) {
            const message = error?.message || 'Failed to sync goals';
            console.error('Failed to sync goals to cloud:', error);
            set({ error: message });
          }
        }
      },
      
      clearError: () => {
        set({ error: null });
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

      setCalorieGoal: async (calories, token) => {
        set((state) => ({
          goals: {
            ...state.goals,
            calories,
          },
        }));

        if (token) {
          try {
            const currentGoals = get().goals;
            await updateGoalsApi(currentGoals, token);
            set({ lastSyncedAt: new Date().toISOString() });
          } catch (error) {
            console.error('Failed to sync goals to cloud:', error);
          }
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
          try {
            const currentGoals = get().goals;
            await updateGoalsApi(currentGoals, token);
            set({ lastSyncedAt: new Date().toISOString() });
          } catch (error) {
            console.error('Failed to sync goals to cloud:', error);
          }
        }
      },

      // Sync goals from cloud
      syncGoals: async (token) => {
        set({ isSyncing: true, error: null });
        
        try {
          const result = await getGoals(token);
          
          if (result.error) {
            set({ 
              error: result.error, 
              isSyncing: false 
            });
            return;
          }
          
          if (result.data) {
            set({
              goals: {
                calories: result.data.calories,
                protein: result.data.protein,
                carbs: result.data.carbs,
                fat: result.data.fat,
                fiber: result.data.fiber,
              },
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
