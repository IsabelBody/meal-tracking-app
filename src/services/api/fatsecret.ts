import {
  FoodSearchResponse,
  FoodSearchResult,
  FatSecretFood,
  NormalizedFood,
  NormalizedServing,
  Nutrition,
} from '../../types';
import { parseNutritionValue } from '../../utils';

// API base URL - this should point to your Lambda proxy
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Search for foods using FatSecret API (via Lambda proxy)
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
  try {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      max_results: String(maxResults),
    });

    const response = await fetch(`${API_BASE_URL}/foods/search?${params}`);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data: FoodSearchResponse = await response.json();
    
    // Handle case where no results or single result
    if (!data.foods?.food) {
      return { foods: [], totalResults: 0, pageNumber: 0 };
    }

    const foods = Array.isArray(data.foods.food) 
      ? data.foods.food 
      : [data.foods.food];

    return {
      foods,
      totalResults: parseInt(data.foods.total_results, 10),
      pageNumber: parseInt(data.foods.page_number, 10),
    };
  } catch (error) {
    console.error('FatSecret search error:', error);
    throw error;
  }
}

/**
 * Get detailed food information by ID
 */
export async function getFoodById(foodId: string): Promise<NormalizedFood | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/foods/${foodId}`);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Get food failed: ${response.statusText}`);
    }

    const data: { food: FatSecretFood } = await response.json();
    return normalizeFatSecretFood(data.food);
  } catch (error) {
    console.error('FatSecret get food error:', error);
    throw error;
  }
}

/**
 * Normalize FatSecret food data to internal format
 */
export function normalizeFatSecretFood(food: FatSecretFood): NormalizedFood {
  const servingsArray = Array.isArray(food.servings.serving)
    ? food.servings.serving
    : [food.servings.serving];

  const servings: NormalizedServing[] = servingsArray.map((serving, index) => ({
    id: serving.serving_id,
    description: serving.serving_description,
    amount: parseNutritionValue(serving.number_of_units) || 1,
    unit: serving.measurement_description || serving.metric_serving_unit || 'serving',
    nutrition: extractNutrition(serving),
    isDefault: index === 0, // First serving is usually the default
  }));

  return {
    id: food.food_id,
    name: food.food_name,
    brand: food.brand_name,
    source: 'fatsecret',
    servings,
  };
}

/**
 * Extract nutrition data from FatSecret serving
 */
function extractNutrition(serving: any): Nutrition {
  return {
    calories: parseNutritionValue(serving.calories),
    protein: parseNutritionValue(serving.protein),
    carbs: parseNutritionValue(serving.carbohydrate),
    fat: parseNutritionValue(serving.fat),
    fiber: parseNutritionValue(serving.fiber),
    sugar: parseNutritionValue(serving.sugar),
    sodium: parseNutritionValue(serving.sodium),
    saturatedFat: parseNutritionValue(serving.saturated_fat),
    cholesterol: parseNutritionValue(serving.cholesterol),
    potassium: parseNutritionValue(serving.potassium),
  };
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
