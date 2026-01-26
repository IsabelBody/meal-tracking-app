import { Nutrition, DiaryEntry, NutritionGoals } from '../types';

/**
 * All optional nutrient fields that can be summed/scaled
 */
const OPTIONAL_NUTRIENT_FIELDS: (keyof Nutrition)[] = [
  'fiber', 'sugar', 'addedSugars', 'alcohol', 'water',
  'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat', 'transFat', 'cholesterol', 'omega3', 'omega6',
  'sodium', 'potassium', 'calcium', 'iron', 'magnesium', 'phosphorus', 'zinc', 'copper', 'manganese', 'selenium',
  'vitaminA', 'vitaminD', 'vitaminE', 'vitaminK',
  'vitaminC', 'thiamin', 'riboflavin', 'niacin', 'pantothenicAcid', 'vitaminB6', 'biotin', 'folate', 'folicAcid', 'folateDFE', 'vitaminB12', 'choline',
  'betaCarotene', 'alphaCarotene', 'lycopene', 'luteinZeaxanthin', 'cryptoxanthin', 'retinol',
  'caffeine', 'theobromine',
];

/**
 * Sum nutrition values from multiple diary entries
 */
export function sumNutrition(entries: DiaryEntry[]): Nutrition {
  const initial: Nutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  return entries.reduce((totals, entry) => {
    const result: Nutrition = {
      calories: totals.calories + entry.nutrition.calories,
      protein: totals.protein + entry.nutrition.protein,
      carbs: totals.carbs + entry.nutrition.carbs,
      fat: totals.fat + entry.nutrition.fat,
    };

    // Sum all optional nutrient fields
    for (const field of OPTIONAL_NUTRIENT_FIELDS) {
      const totalValue = totals[field] as number | undefined;
      const entryValue = entry.nutrition[field] as number | undefined;
      if (totalValue !== undefined || entryValue !== undefined) {
        (result as Record<string, number | undefined>)[field] = (totalValue || 0) + (entryValue || 0);
      }
    }

    return result;
  }, initial);
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
 * Nutrients that should be rounded to whole numbers (typically mg/mcg values)
 */
const WHOLE_NUMBER_NUTRIENTS: (keyof Nutrition)[] = [
  'calories', 'sodium', 'potassium', 'calcium', 'cholesterol',
  'magnesium', 'phosphorus', 'caffeine', 'theobromine',
  'betaCarotene', 'alphaCarotene', 'lycopene', 'luteinZeaxanthin', 'cryptoxanthin', 'retinol',
];

/**
 * Scale nutrition values by serving amount
 */
export function scaleNutrition(nutrition: Nutrition, multiplier: number): Nutrition {
  const result: Nutrition = {
    calories: Math.round(nutrition.calories * multiplier),
    protein: Math.round(nutrition.protein * multiplier * 10) / 10,
    carbs: Math.round(nutrition.carbs * multiplier * 10) / 10,
    fat: Math.round(nutrition.fat * multiplier * 10) / 10,
  };

  // Scale all optional nutrient fields
  for (const field of OPTIONAL_NUTRIENT_FIELDS) {
    const value = nutrition[field] as number | undefined;
    if (value !== undefined && value !== null) {
      const scaled = value * multiplier;
      // Use whole numbers for mg/mcg values, one decimal for grams
      (result as Record<string, number | undefined>)[field] = WHOLE_NUMBER_NUTRIENTS.includes(field)
        ? Math.round(scaled)
        : Math.round(scaled * 10) / 10;
    }
  }

  return result;
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
  if (unit === 'mg' || unit === 'mcg') {
    // For very small values (< 1), show more decimal places
    if (value > 0 && value < 1) {
      return `${Math.round(value * 100) / 100}${unit}`;
    }
    return `${Math.round(value)}${unit}`;
  }
  // For grams, show one decimal place
  return `${Math.round(value * 10) / 10}${unit}`;
}

/**
 * Calculate percentage of daily value
 */
export function calculateDailyValuePercent(value: number, dailyValue: number | undefined): number | undefined {
  if (!dailyValue || dailyValue <= 0) return undefined;
  return Math.round((value / dailyValue) * 100);
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

// ============================================================================
// TDEE & Goal Calculator
// ============================================================================

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type WeightGoal = 'lose_2' | 'lose_1.5' | 'lose_1' | 'lose_0.5' | 'maintain' | 'gain_0.5' | 'gain_1';

export interface BodyStats {
  gender: Gender;
  weight: number; // in kg
  height: number; // in cm
  age: number;
  activityLevel: ActivityLevel;
}

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { factor: number; label: string; description: string }> = {
  sedentary: { factor: 1.2, label: 'Sedentary', description: 'Little or no exercise' },
  light: { factor: 1.375, label: 'Light', description: 'Exercise 1-3 times/week' },
  moderate: { factor: 1.55, label: 'Moderate', description: 'Exercise 3-5 times/week' },
  active: { factor: 1.725, label: 'Active', description: 'Exercise 6-7 times/week' },
  very_active: { factor: 1.9, label: 'Very Active', description: 'Intense exercise daily' },
};

export const WEIGHT_GOAL_ADJUSTMENTS: Record<WeightGoal, { adjustment: number; label: string; rate: string }> = {
  lose_2: { adjustment: -1000, label: 'Lose weight', rate: '0.9 kg/week' },
  'lose_1.5': { adjustment: -750, label: 'Lose weight', rate: '0.7 kg/week' },
  lose_1: { adjustment: -500, label: 'Lose weight', rate: '0.45 kg/week' },
  'lose_0.5': { adjustment: -250, label: 'Lose weight', rate: '0.2 kg/week' },
  maintain: { adjustment: 0, label: 'Maintain', rate: 'Stay the same' },
  'gain_0.5': { adjustment: 250, label: 'Gain weight', rate: '0.2 kg/week' },
  gain_1: { adjustment: 500, label: 'Gain weight', rate: '0.45 kg/week' },
};

/**
 * Calculate BMR using Mifflin-St Jeor equation (most accurate)
 * Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
 * Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
 */
export function calculateBMR(stats: BodyStats): number {
  const base = 10 * stats.weight + 6.25 * stats.height - 5 * stats.age;
  return stats.gender === 'male' ? base + 5 : base - 161;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(stats: BodyStats): number {
  const bmr = calculateBMR(stats);
  const multiplier = ACTIVITY_MULTIPLIERS[stats.activityLevel].factor;
  return Math.round(bmr * multiplier);
}

/**
 * Calculate recommended daily calories based on TDEE and weight goal
 */
export function calculateTargetCalories(stats: BodyStats, goal: WeightGoal): number {
  const tdee = calculateTDEE(stats);
  const adjustment = WEIGHT_GOAL_ADJUSTMENTS[goal].adjustment;
  // Ensure minimum safe calorie intake
  const minCalories = stats.gender === 'male' ? 1500 : 1200;
  return Math.max(minCalories, tdee + adjustment);
}

/**
 * Calculate recommended macros based on calorie target
 * Uses balanced distribution: 30% protein, 40% carbs, 30% fat
 */
export function calculateRecommendedMacros(
  calories: number,
  preset: 'balanced' | 'low_carb' | 'high_protein' | 'keto' = 'balanced'
): { protein: number; carbs: number; fat: number } {
  const distributions = {
    balanced: { protein: 0.25, carbs: 0.45, fat: 0.30 },
    low_carb: { protein: 0.35, carbs: 0.25, fat: 0.40 },
    high_protein: { protein: 0.40, carbs: 0.30, fat: 0.30 },
    keto: { protein: 0.25, carbs: 0.05, fat: 0.70 },
  };

  const dist = distributions[preset];
  
  return {
    protein: Math.round((calories * dist.protein) / 4), // 4 cal per gram
    carbs: Math.round((calories * dist.carbs) / 4),     // 4 cal per gram
    fat: Math.round((calories * dist.fat) / 9),         // 9 cal per gram
  };
}

/**
 * Convert inches to cm
 */
export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54 * 10) / 10;
}

/**
 * Convert cm to inches
 */
export function cmToInches(cm: number): number {
  return Math.round(cm / 2.54 * 10) / 10;
}

/**
 * Convert feet and inches to cm
 */
export function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return inchesToCm(totalInches);
}

/**
 * Convert cm to feet and inches
 */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cmToInches(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}
