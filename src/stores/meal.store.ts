import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DraftMeal, MealItem, Nutrition, SavedMeal } from '../types';
import { getISOTimestamp } from '../utils/date';

// Stable empty array reference to avoid infinite re-renders
const EMPTY_MEALS: SavedMeal[] = [];

/**
 * Sum nutrition values from multiple meal items
 */
function sumMealItemNutrition(items: MealItem[]): Nutrition {
  const initial: Nutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  if (items.length === 0) return initial;

  return items.reduce((totals, item) => {
    const result: Nutrition = {
      calories: totals.calories + item.nutrition.calories,
      protein: totals.protein + item.nutrition.protein,
      carbs: totals.carbs + item.nutrition.carbs,
      fat: totals.fat + item.nutrition.fat,
    };

    // Sum all optional nutrient fields
    const optionalFields: (keyof Nutrition)[] = [
      'fiber', 'sugar', 'addedSugars', 'alcohol', 'water',
      'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat', 'transFat', 'cholesterol', 'omega3', 'omega6',
      'sodium', 'potassium', 'calcium', 'iron', 'magnesium', 'phosphorus', 'zinc', 'copper', 'manganese', 'selenium',
      'vitaminA', 'vitaminD', 'vitaminE', 'vitaminK',
      'vitaminC', 'thiamin', 'riboflavin', 'niacin', 'pantothenicAcid', 'vitaminB6', 'biotin', 'folate', 'folicAcid', 'folateDFE', 'vitaminB12', 'choline',
      'betaCarotene', 'alphaCarotene', 'lycopene', 'luteinZeaxanthin', 'cryptoxanthin', 'retinol',
      'caffeine', 'theobromine',
    ];

    for (const field of optionalFields) {
      const totalValue = totals[field] as number | undefined;
      const itemValue = item.nutrition[field] as number | undefined;
      if (totalValue !== undefined || itemValue !== undefined) {
        (result as Record<string, number | undefined>)[field] = (totalValue || 0) + (itemValue || 0);
      }
    }

    return result;
  }, initial);
}

interface MealState {
  // Data
  savedMeals: SavedMeal[];
  draftMeal: DraftMeal | null;

  // Actions
  startDraftMeal: () => void;
  addItemToDraft: (item: Omit<MealItem, 'id'>) => void;
  removeItemFromDraft: (itemId: string) => void;
  updateDraftName: (name: string) => void;
  saveDraftMeal: (name: string) => SavedMeal | null;
  cancelDraft: () => void;
  deleteMeal: (mealId: string) => void;
  updateMeal: (mealId: string, updates: { name?: string; items?: MealItem[] }) => void;

  // Selectors
  getMealById: (mealId: string) => SavedMeal | undefined;
  hasDraft: () => boolean;
  getDraftItemCount: () => number;
}

export const useMealStore = create<MealState>()(
  persist(
    (set, get) => ({
      // Initial state
      savedMeals: [],
      draftMeal: null,

      // Actions
      startDraftMeal: () => {
        set({
          draftMeal: {
            items: [],
            name: undefined,
          },
        });
      },

      addItemToDraft: (itemData) => {
        const id = uuidv4();
        const newItem: MealItem = {
          ...itemData,
          id,
        };

        set((state) => {
          // If no draft exists, start one
          const draft = state.draftMeal || { items: [], name: undefined };
          return {
            draftMeal: {
              ...draft,
              items: [...draft.items, newItem],
            },
          };
        });
      },

      removeItemFromDraft: (itemId) => {
        set((state) => {
          if (!state.draftMeal) return state;
          return {
            draftMeal: {
              ...state.draftMeal,
              items: state.draftMeal.items.filter((item) => item.id !== itemId),
            },
          };
        });
      },

      updateDraftName: (name) => {
        set((state) => {
          if (!state.draftMeal) return state;
          return {
            draftMeal: {
              ...state.draftMeal,
              name,
            },
          };
        });
      },

      saveDraftMeal: (name) => {
        const { draftMeal } = get();
        if (!draftMeal || draftMeal.items.length === 0) return null;

        const timestamp = getISOTimestamp();
        const totalNutrition = sumMealItemNutrition(draftMeal.items);

        const newMeal: SavedMeal = {
          id: uuidv4(),
          name: name.trim() || 'Untitled Meal',
          items: draftMeal.items,
          totalNutrition,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        set((state) => ({
          savedMeals: [newMeal, ...state.savedMeals],
          draftMeal: null,
        }));

        return newMeal;
      },

      cancelDraft: () => {
        set({ draftMeal: null });
      },

      deleteMeal: (mealId) => {
        set((state) => ({
          savedMeals: state.savedMeals.filter((meal) => meal.id !== mealId),
        }));
      },

      updateMeal: (mealId, updates) => {
        set((state) => {
          const index = state.savedMeals.findIndex((m) => m.id === mealId);
          if (index === -1) return state;

          const updatedMeals = [...state.savedMeals];
          const existingMeal = updatedMeals[index];

          const newItems = updates.items ?? existingMeal.items;
          const totalNutrition = updates.items
            ? sumMealItemNutrition(newItems)
            : existingMeal.totalNutrition;

          updatedMeals[index] = {
            ...existingMeal,
            name: updates.name ?? existingMeal.name,
            items: newItems,
            totalNutrition,
            updatedAt: getISOTimestamp(),
          };

          return { savedMeals: updatedMeals };
        });
      },

      // Selectors
      getMealById: (mealId) => {
        return get().savedMeals.find((meal) => meal.id === mealId);
      },

      hasDraft: () => {
        return get().draftMeal !== null;
      },

      getDraftItemCount: () => {
        return get().draftMeal?.items.length ?? 0;
      },
    }),
    {
      name: 'meal-tracker-saved-meals',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        savedMeals: state.savedMeals,
        draftMeal: state.draftMeal,
      }),
    }
  )
);

// Helper hooks
export function useSavedMeals() {
  return useMealStore((state) => state.savedMeals.length > 0 ? state.savedMeals : EMPTY_MEALS);
}

export function useDraftMeal() {
  return useMealStore((state) => state.draftMeal);
}

export function useHasDraft() {
  return useMealStore((state) => state.draftMeal !== null);
}

export function useDraftItemCount() {
  return useMealStore((state) => state.draftMeal?.items.length ?? 0);
}
