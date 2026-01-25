import { Nutrition } from './food';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  mealType: MealType;
  foodId: string;
  foodName: string;
  brandName?: string;
  servingId: string;
  servingAmount: number;
  servingUnit: string;
  servingDescription: string;
  nutrition: Nutrition;
  source: 'fatsecret' | 'openfoodfacts' | 'custom';
  createdAt: string;
  updatedAt: string;
  // Cloud sync fields
  cloudEntryKey?: string; // DynamoDB sort key for cloud operations
  synced?: boolean; // Whether entry is synced with cloud
}

export interface DailySummary {
  date: string;
  entries: DiaryEntry[];
  totals: Nutrition;
  goals: NutritionGoals;
  remaining: Nutrition;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface MealSection {
  type: MealType;
  label: string;
  entries: DiaryEntry[];
  totals: Nutrition;
}

export const MEAL_TYPES: { type: MealType; label: string; icon: string }[] = [
  { type: 'breakfast', label: 'Breakfast', icon: 'sunrise' },
  { type: 'lunch', label: 'Lunch', icon: 'sun' },
  { type: 'dinner', label: 'Dinner', icon: 'sunset' },
  { type: 'snack', label: 'Snacks', icon: 'cookie' },
];

export const DEFAULT_GOALS: NutritionGoals = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
  fiber: 25,
  sugar: 50,
  sodium: 2300,
};
