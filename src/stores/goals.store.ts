import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NutritionGoals, DEFAULT_GOALS } from '../types';
import { getGoals, updateGoals as updateGoalsApi } from '../services/api/diary';

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
  isSyncing: boolean;
  lastSyncedAt: string | null;

  // Actions
  updateGoals: (updates: Partial<NutritionGoals>, token?: string) => Promise<void>;
  resetGoals: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setCalorieGoal: (calories: number, token?: string) => Promise<void>;
  setMacroGoals: (protein: number, carbs: number, fat: number, token?: string) => Promise<void>;
  
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

      // Actions
      updateGoals: async (updates, token) => {
        // Update locally first (optimistic)
        set((state) => ({
          goals: {
            ...state.goals,
            ...updates,
          },
        }));

        // Sync to cloud if authenticated
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
        set({ isSyncing: true });
        
        try {
          const result = await getGoals(token);
          
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
            });
          } else {
            set({ isSyncing: false });
          }
        } catch (error) {
          console.error('Failed to sync goals from cloud:', error);
          set({ isSyncing: false });
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
