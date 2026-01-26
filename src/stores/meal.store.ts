import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getSavedMeals } from '../services/api/user-data';
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
  editingMealId: string | null; // ID of meal being edited (null = creating new)
  editingDraftItemId: string | null; // ID of draft item being edited (for full item editing)
  isActivelyBuildingMeal: boolean; // True when user is in meal creation/editing session (not persisted)

  // Actions
  startDraftMeal: () => void;
  startEditingMeal: (mealId: string) => boolean; // Returns false if meal not found
  activateMealBuilding: () => void; // Activate meal building mode without clearing draft
  addItemToDraft: (item: Omit<MealItem, 'id'>) => void;
  removeItemFromDraft: (itemId: string) => void;
  updateItemInDraft: (itemId: string, servingAmount: number) => void; // Update item serving amount
  startEditingDraftItem: (itemId: string) => MealItem | null; // Start editing a draft item, returns the item
  cancelEditingDraftItem: () => void; // Cancel editing draft item
  replaceEditingDraftItem: (item: Omit<MealItem, 'id'>) => void; // Replace the item being edited
  updateDraftName: (name: string) => void;
  saveDraftMeal: (name: string) => SavedMeal | null;
  cancelDraft: () => void;
  deleteMeal: (mealId: string) => void;
  updateMeal: (mealId: string, updates: { name?: string; items?: MealItem[] }) => void;
  syncMeals: (token: string) => Promise<void>;

  // Selectors
  getMealById: (mealId: string) => SavedMeal | undefined;
  getDraftItemById: (itemId: string) => MealItem | undefined;
  getEditingDraftItem: () => MealItem | undefined;
  hasDraft: () => boolean;
  getDraftItemCount: () => number;
  isEditing: () => boolean;
  isEditingDraftItem: () => boolean;
  isActiveSession: () => boolean;
}

export const useMealStore = create<MealState>()(
  persist(
    (set, get) => ({
      // Initial state
      savedMeals: [],
      draftMeal: null,
      editingMealId: null,
      editingDraftItemId: null,
      isActivelyBuildingMeal: false, // Not persisted - resets on app restart

      // Actions
      startDraftMeal: () => {
        set({
          draftMeal: {
            items: [],
            name: undefined,
          },
          editingMealId: null,
          isActivelyBuildingMeal: true,
        });
      },

      startEditingMeal: (mealId) => {
        const meal = get().savedMeals.find((m) => m.id === mealId);
        if (!meal) return false;

        set({
          draftMeal: {
            items: [...meal.items], // Clone the items array
            name: meal.name,
          },
          editingMealId: mealId,
          isActivelyBuildingMeal: true,
        });
        return true;
      },

      activateMealBuilding: () => {
        set({ isActivelyBuildingMeal: true });
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

      updateItemInDraft: (itemId, servingAmount) => {
        set((state) => {
          if (!state.draftMeal) return state;
          
          const itemIndex = state.draftMeal.items.findIndex((item) => item.id === itemId);
          if (itemIndex === -1) return state;
          
          const item = state.draftMeal.items[itemIndex];
          const oldAmount = item.servingAmount;
          
          // Scale nutrition based on the ratio of new amount to old amount
          const ratio = servingAmount / oldAmount;
          const scaledNutrition = { ...item.nutrition };
          
          // Scale all nutrition values
          for (const key of Object.keys(scaledNutrition) as (keyof typeof scaledNutrition)[]) {
            const value = scaledNutrition[key];
            if (typeof value === 'number') {
              (scaledNutrition as Record<string, number>)[key] = value * ratio;
            }
          }
          
          const updatedItem: MealItem = {
            ...item,
            servingAmount,
            nutrition: scaledNutrition,
          };
          
          const newItems = [...state.draftMeal.items];
          newItems[itemIndex] = updatedItem;
          
          return {
            draftMeal: {
              ...state.draftMeal,
              items: newItems,
            },
          };
        });
      },

      startEditingDraftItem: (itemId) => {
        const item = get().draftMeal?.items.find((i) => i.id === itemId);
        if (!item) return null;
        set({ editingDraftItemId: itemId });
        return item;
      },

      cancelEditingDraftItem: () => {
        set({ editingDraftItemId: null });
      },

      replaceEditingDraftItem: (itemData) => {
        const { editingDraftItemId, draftMeal } = get();
        if (!editingDraftItemId || !draftMeal) return;

        const itemIndex = draftMeal.items.findIndex((item) => item.id === editingDraftItemId);
        if (itemIndex === -1) return;

        const updatedItem: MealItem = {
          ...itemData,
          id: editingDraftItemId, // Keep the same ID
        };

        const newItems = [...draftMeal.items];
        newItems[itemIndex] = updatedItem;

        set({
          draftMeal: {
            ...draftMeal,
            items: newItems,
          },
          editingDraftItemId: null,
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
        const { draftMeal, editingMealId, savedMeals } = get();
        if (!draftMeal || draftMeal.items.length === 0) return null;

        const timestamp = getISOTimestamp();
        const totalNutrition = sumMealItemNutrition(draftMeal.items);
        const trimmedName = name.trim() || 'Untitled Meal';

        // If editing an existing meal, update it
        if (editingMealId) {
          const index = savedMeals.findIndex((m) => m.id === editingMealId);
          if (index === -1) return null;

          const updatedMeals = [...savedMeals];
          const existingMeal = updatedMeals[index];

          const updatedMeal: SavedMeal = {
            ...existingMeal,
            name: trimmedName,
            items: draftMeal.items,
            totalNutrition,
            updatedAt: timestamp,
          };

          updatedMeals[index] = updatedMeal;

          set({
            savedMeals: updatedMeals,
            draftMeal: null,
            editingMealId: null,
            isActivelyBuildingMeal: false,
          });

          return updatedMeal;
        }

        // Creating a new meal
        const newMeal: SavedMeal = {
          id: uuidv4(),
          name: trimmedName,
          items: draftMeal.items,
          totalNutrition,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        set({
          savedMeals: [newMeal, ...savedMeals],
          draftMeal: null,
          editingMealId: null,
          isActivelyBuildingMeal: false,
        });

        return newMeal;
      },

      cancelDraft: () => {
        set({ draftMeal: null, editingMealId: null, isActivelyBuildingMeal: false });
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

      syncMeals: async (token) => {
        const res = await getSavedMeals(token);
        if (res.error || !res.data) return;
        const cloud = res.data.meals;
        const cloudIds = new Set(cloud.map((m) => m.id));
        set((state) => {
          const localOnly = state.savedMeals.filter((m) => !cloudIds.has(m.id));
          return { savedMeals: [...cloud, ...localOnly] };
        });
      },

      // Selectors
      getMealById: (mealId) => {
        return get().savedMeals.find((meal) => meal.id === mealId);
      },

      getDraftItemById: (itemId) => {
        return get().draftMeal?.items.find((item) => item.id === itemId);
      },

      getEditingDraftItem: () => {
        const { editingDraftItemId, draftMeal } = get();
        if (!editingDraftItemId || !draftMeal) return undefined;
        return draftMeal.items.find((item) => item.id === editingDraftItemId);
      },

      hasDraft: () => {
        return get().draftMeal !== null;
      },

      getDraftItemCount: () => {
        return get().draftMeal?.items.length ?? 0;
      },

      isEditing: () => {
        return get().editingMealId !== null;
      },

      isEditingDraftItem: () => {
        return get().editingDraftItemId !== null;
      },

      isActiveSession: () => {
        return get().isActivelyBuildingMeal;
      },
    }),
    {
      name: 'meal-tracker-saved-meals',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        savedMeals: state.savedMeals,
        draftMeal: state.draftMeal,
        editingMealId: state.editingMealId,
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

export function useIsEditingMeal() {
  return useMealStore((state) => state.editingMealId !== null);
}

export function useEditingMealId() {
  return useMealStore((state) => state.editingMealId);
}

export function useIsActivelyBuildingMeal() {
  return useMealStore((state) => state.isActivelyBuildingMeal);
}

export function useIsEditingDraftItem() {
  return useMealStore((state) => state.editingDraftItemId !== null);
}

export function useEditingDraftItemId() {
  return useMealStore((state) => state.editingDraftItemId);
}

export function useEditingDraftItem() {
  return useMealStore((state) => {
    const { editingDraftItemId, draftMeal } = state;
    if (!editingDraftItemId || !draftMeal) return undefined;
    return draftMeal.items.find((item) => item.id === editingDraftItemId);
  });
}
