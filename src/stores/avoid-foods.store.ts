import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
    AvoidCheckResult,
    AvoidedIngredient,
    DEFAULT_AVOIDED_INGREDIENTS,
} from '../types/avoid-foods';

interface AvoidFoodsState {
  // Data
  avoidedIngredients: AvoidedIngredient[];

  // Actions
  addIngredient: (term: string) => void;
  removeIngredient: (id: string) => void;
  toggleIngredient: (id: string) => void;
  resetToDefaults: () => void;

  // Checking functions
  checkIngredients: (ingredientsText: string | undefined) => AvoidCheckResult;
  getEnabledTerms: () => string[];
}

/**
 * Generate a unique ID for new ingredients
 */
const generateId = () => `avoid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Initialize default ingredients with IDs
 */
const initializeDefaults = (): AvoidedIngredient[] =>
  DEFAULT_AVOIDED_INGREDIENTS.map((item, index) => ({
    ...item,
    id: `default_${index}`,
  }));

export const useAvoidFoodsStore = create<AvoidFoodsState>()(
  persist(
    (set, get) => ({
      // Initial state with defaults
      avoidedIngredients: initializeDefaults(),

      // Add a new ingredient to avoid
      addIngredient: (term: string) => {
        const trimmedTerm = term.trim().toLowerCase();
        if (!trimmedTerm) return;

        // Check if term already exists
        const existing = get().avoidedIngredients.find(
          (item) => item.term.toLowerCase() === trimmedTerm
        );
        if (existing) return;

        set((state) => ({
          avoidedIngredients: [
            ...state.avoidedIngredients,
            {
              id: generateId(),
              term: trimmedTerm,
              enabled: true,
              isDefault: false,
            },
          ],
        }));
      },

      // Remove an ingredient (only non-defaults, or disable defaults)
      removeIngredient: (id: string) => {
        set((state) => ({
          avoidedIngredients: state.avoidedIngredients.filter(
            (item) => item.id !== id
          ),
        }));
      },

      // Toggle an ingredient on/off
      toggleIngredient: (id: string) => {
        set((state) => ({
          avoidedIngredients: state.avoidedIngredients.map((item) =>
            item.id === id ? { ...item, enabled: !item.enabled } : item
          ),
        }));
      },

      // Reset to default list
      resetToDefaults: () => {
        set({ avoidedIngredients: initializeDefaults() });
      },

      // Get list of enabled terms for quick access
      getEnabledTerms: () => {
        return get()
          .avoidedIngredients.filter((item) => item.enabled)
          .map((item) => item.term);
      },

      // Check if ingredients text contains any avoided ingredients
      checkIngredients: (ingredientsText: string | undefined): AvoidCheckResult => {
        if (!ingredientsText) {
          return { hasAvoidedIngredients: false, matchedTerms: [] };
        }

        const lowerIngredients = ingredientsText.toLowerCase();
        const enabledTerms = get().getEnabledTerms();
        const matchedTerms: string[] = [];

        for (const term of enabledTerms) {
          // Use word boundary matching to avoid false positives
          // e.g., "sugar" should match "sugar" but not necessarily "sugarcane"
          // However, we want to catch variations like "cane sugar", "brown sugar"
          if (lowerIngredients.includes(term.toLowerCase())) {
            matchedTerms.push(term);
          }
        }

        return {
          hasAvoidedIngredients: matchedTerms.length > 0,
          matchedTerms,
        };
      },
    }),
    {
      name: 'meal-tracker-avoid-foods',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        avoidedIngredients: state.avoidedIngredients,
      }),
    }
  )
);

/**
 * Hook to check a specific food's ingredients
 */
export function useAvoidCheck(ingredientsText: string | undefined): AvoidCheckResult {
  const checkIngredients = useAvoidFoodsStore((state) => state.checkIngredients);
  return checkIngredients(ingredientsText);
}

/**
 * Hook to get enabled avoided terms
 */
export function useEnabledAvoidTerms(): string[] {
  const avoidedIngredients = useAvoidFoodsStore((state) => state.avoidedIngredients);
  return avoidedIngredients.filter((item) => item.enabled).map((item) => item.term);
}
