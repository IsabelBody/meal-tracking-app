import { Nutrition } from './food';

/**
 * Individual food item within a saved meal
 * Similar to DiaryEntry but without date/mealType (those are set when adding to diary)
 */
export interface MealItem {
  id: string;
  foodId: string;
  foodName: string;
  brandName?: string;
  servingId: string;
  servingAmount: number;
  servingUnit: string;
  servingDescription: string;
  nutrition: Nutrition;
  source: 'openfoodfacts' | 'usda' | 'custom';
}

/**
 * A saved meal that can be reused
 * When added to diary, appears as a single entry with combined nutrition
 */
export interface SavedMeal {
  id: string;
  name: string;
  items: MealItem[];
  totalNutrition: Nutrition; // Pre-calculated sum of all items
  createdAt: string;
  updatedAt: string;
}

/**
 * Draft meal being built (before saving)
 */
export interface DraftMeal {
  items: MealItem[];
  name?: string;
}
