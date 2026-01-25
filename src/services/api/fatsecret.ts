/**
 * Food Search Service
 * 
 * Uses USDA FoodData Central as the primary data source.
 * USDA provides excellent coverage of generic foods with no IP restrictions.
 */

import {
  FoodSearchResult,
  NormalizedFood,
  Nutrition,
} from '../../types';
import * as USDA from './usda';

/**
 * Search for foods using USDA FoodData Central
 */
export async function searchFoods(
  query: string,
  page: number = 0,
  maxResults: number = 20
): Promise<{
  foods: FoodSearchResult[];
  totalResults: number;
  pageNumber: number;
}> {
  return USDA.searchFoods(query, page, maxResults);
}

/**
 * Get detailed food information by ID
 * Handles USDA IDs (prefixed with 'usda_')
 */
export async function getFoodById(foodId: string): Promise<NormalizedFood | null> {
  // Handle USDA IDs
  if (foodId.startsWith('usda_')) {
    return USDA.getFoodById(foodId);
  }

  // Legacy: Handle Open Food Facts IDs (prefixed with 'off_')
  if (foodId.startsWith('off_')) {
    const barcode = foodId.replace('off_', '');
    console.log('[OpenFoodFacts] Getting food by barcode:', barcode);
    const { getProductByBarcode } = await import('./openfoodfacts');
    return getProductByBarcode(barcode);
  }

  // Assume it's a USDA ID without prefix
  return USDA.getFoodById(`usda_${foodId}`);
}

/**
 * Parse food description to extract quick nutrition info
 * Format: "Per 100g - Calories: 195kcal | Fat: 7.72g | Carbs: 0g | Protein: 29.55g"
 */
export function parseQuickNutrition(description: string): Partial<Nutrition> | null {
  try {
    const caloriesMatch = description.match(/Calories:\s*(\d+)/i);
    const fatMatch = description.match(/Fat:\s*([\d.]+)/i);
    const carbsMatch = description.match(/Carbs:\s*([\d.]+)/i);
    const proteinMatch = description.match(/Protein:\s*([\d.]+)/i);

    if (!caloriesMatch) return null;

    return {
      calories: parseInt(caloriesMatch[1], 10),
      fat: fatMatch ? parseFloat(fatMatch[1]) : 0,
      carbs: carbsMatch ? parseFloat(carbsMatch[1]) : 0,
      protein: proteinMatch ? parseFloat(proteinMatch[1]) : 0,
    };
  } catch {
    return null;
  }
}
