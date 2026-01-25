import { Nutrition, DiaryEntry, NutritionGoals } from '../types';

/**
 * Sum nutrition values from multiple diary entries
 */
export function sumNutrition(entries: DiaryEntry[]): Nutrition {
  return entries.reduce(
    (totals, entry) => ({
      calories: totals.calories + entry.nutrition.calories,
      protein: totals.protein + entry.nutrition.protein,
      carbs: totals.carbs + entry.nutrition.carbs,
      fat: totals.fat + entry.nutrition.fat,
      fiber: (totals.fiber || 0) + (entry.nutrition.fiber || 0),
      sugar: (totals.sugar || 0) + (entry.nutrition.sugar || 0),
      sodium: (totals.sodium || 0) + (entry.nutrition.sodium || 0),
      saturatedFat: (totals.saturatedFat || 0) + (entry.nutrition.saturatedFat || 0),
      cholesterol: (totals.cholesterol || 0) + (entry.nutrition.cholesterol || 0),
      potassium: (totals.potassium || 0) + (entry.nutrition.potassium || 0),
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      saturatedFat: 0,
      cholesterol: 0,
      potassium: 0,
    }
  );
}

/**
 * Calculate remaining nutrition based on goals
 */
export function calculateRemaining(totals: Nutrition, goals: NutritionGoals): Nutrition {
  return {
    calories: Math.max(0, goals.calories - totals.calories),
    protein: Math.max(0, goals.protein - totals.protein),
    carbs: Math.max(0, goals.carbs - totals.carbs),
    fat: Math.max(0, goals.fat - totals.fat),
    fiber: goals.fiber ? Math.max(0, goals.fiber - (totals.fiber || 0)) : undefined,
    sugar: goals.sugar ? Math.max(0, goals.sugar - (totals.sugar || 0)) : undefined,
    sodium: goals.sodium ? Math.max(0, goals.sodium - (totals.sodium || 0)) : undefined,
  };
}

/**
 * Calculate progress percentage for a nutrient
 */
export function calculateProgress(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}

/**
 * Scale nutrition values by serving amount
 */
export function scaleNutrition(nutrition: Nutrition, multiplier: number): Nutrition {
  return {
    calories: Math.round(nutrition.calories * multiplier),
    protein: Math.round(nutrition.protein * multiplier * 10) / 10,
    carbs: Math.round(nutrition.carbs * multiplier * 10) / 10,
    fat: Math.round(nutrition.fat * multiplier * 10) / 10,
    fiber: nutrition.fiber ? Math.round(nutrition.fiber * multiplier * 10) / 10 : undefined,
    sugar: nutrition.sugar ? Math.round(nutrition.sugar * multiplier * 10) / 10 : undefined,
    sodium: nutrition.sodium ? Math.round(nutrition.sodium * multiplier) : undefined,
    saturatedFat: nutrition.saturatedFat
      ? Math.round(nutrition.saturatedFat * multiplier * 10) / 10
      : undefined,
    cholesterol: nutrition.cholesterol
      ? Math.round(nutrition.cholesterol * multiplier)
      : undefined,
    potassium: nutrition.potassium ? Math.round(nutrition.potassium * multiplier) : undefined,
  };
}

/**
 * Parse string nutrition value to number
 */
export function parseNutritionValue(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format nutrition value for display
 */
export function formatNutritionValue(value: number, unit: string = 'g'): string {
  if (unit === 'kcal' || unit === 'cal') {
    return `${Math.round(value)}`;
  }
  if (unit === 'mg') {
    return `${Math.round(value)}${unit}`;
  }
  // For grams, show one decimal place
  return `${Math.round(value * 10) / 10}${unit}`;
}

/**
 * Get macro percentage breakdown
 */
export function getMacroPercentages(nutrition: Nutrition): {
  protein: number;
  carbs: number;
  fat: number;
} {
  const proteinCals = nutrition.protein * 4;
  const carbsCals = nutrition.carbs * 4;
  const fatCals = nutrition.fat * 9;
  const totalCals = proteinCals + carbsCals + fatCals;

  if (totalCals === 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }

  return {
    protein: Math.round((proteinCals / totalCals) * 100),
    carbs: Math.round((carbsCals / totalCals) * 100),
    fat: Math.round((fatCals / totalCals) * 100),
  };
}
