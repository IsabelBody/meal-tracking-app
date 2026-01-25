/**
 * USDA FoodData Central API Service
 * 
 * Free API with no IP restrictions. Excellent coverage of generic foods.
 * API Docs: https://fdc.nal.usda.gov/api-guide.html
 */

import {
  FoodSearchResult,
  NormalizedFood,
  NormalizedServing,
  Nutrition,
} from '../../types';

// USDA FoodData Central API
const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';
const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY || 'DEMO_KEY';

// USDA API Response Types
interface USDASearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDASearchFood[];
}

interface USDASearchFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  foodNutrients: USDANutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
}

interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

interface USDAFoodDetail {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  foodNutrients: USDADetailNutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
  foodPortions?: USDAFoodPortion[];
  householdServingFullText?: string;
}

interface USDADetailNutrient {
  nutrient: {
    id: number;
    number: string;
    name: string;
    unitName: string;
  };
  amount: number;
}

interface USDAFoodPortion {
  id: number;
  gramWeight: number;
  amount: number;
  measureUnit: {
    name: string;
    abbreviation: string;
  };
  modifier?: string;
  portionDescription?: string;
}

// Nutrient IDs for common nutrients
const NUTRIENT_IDS = {
  calories: 1008,    // Energy (kcal)
  protein: 1003,     // Protein
  fat: 1004,         // Total lipid (fat)
  carbs: 1005,       // Carbohydrate
  fiber: 1079,       // Fiber, total dietary
  sugar: 2000,       // Sugars, total
  sodium: 1093,      // Sodium
  saturatedFat: 1258, // Fatty acids, saturated
  cholesterol: 1253,  // Cholesterol
  potassium: 1092,   // Potassium
};

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
  console.log('[USDA] Searching for:', query);

  const params = new URLSearchParams({
    api_key: USDA_API_KEY,
    query: query,
    pageSize: String(maxResults),
    pageNumber: String(page + 1), // USDA uses 1-based pages
    // Prioritize Foundation and SR Legacy (generic foods) over Branded
    dataType: 'Foundation,SR Legacy,Branded',
  });

  const url = `${USDA_API_BASE}/foods/search?${params}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[USDA] API error:', response.status, errorText);
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data: USDASearchResponse = await response.json();
    console.log('[USDA] Found', data.foods?.length || 0, 'foods, total:', data.totalHits);

    const foods: FoodSearchResult[] = (data.foods || []).map(food => ({
      food_id: `usda_${food.fdcId}`,
      food_name: food.description,
      food_description: formatNutritionDescription(food),
      food_type: food.brandOwner || food.brandName ? 'Brand' : 'Generic',
      brand_name: food.brandOwner || food.brandName,
    }));

    return {
      foods,
      totalResults: data.totalHits,
      pageNumber: page,
    };
  } catch (error) {
    console.error('[USDA] Search error:', error);
    throw error;
  }
}

/**
 * Get detailed food information by USDA FDC ID
 */
export async function getFoodById(fdcId: string): Promise<NormalizedFood | null> {
  // Remove 'usda_' prefix if present
  const id = fdcId.replace('usda_', '');
  console.log('[USDA] Getting food details for:', id);

  const url = `${USDA_API_BASE}/food/${id}?api_key=${USDA_API_KEY}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`USDA API error: ${response.status}`);
    }

    const food: USDAFoodDetail = await response.json();
    return normalizeUSDAFood(food);
  } catch (error) {
    console.error('[USDA] Get food error:', error);
    throw error;
  }
}

/**
 * Format nutrition description for search results
 */
function formatNutritionDescription(food: USDASearchFood): string {
  const nutrients = food.foodNutrients || [];
  
  const calories = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.calories)?.value ?? 0;
  const fat = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.fat)?.value ?? 0;
  const carbs = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.carbs)?.value ?? 0;
  const protein = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.protein)?.value ?? 0;

  const servingInfo = food.servingSize && food.servingSizeUnit 
    ? `${food.servingSize}${food.servingSizeUnit}`
    : '100g';

  return `Per ${servingInfo} - Calories: ${Math.round(calories)}kcal | Fat: ${fat.toFixed(1)}g | Carbs: ${carbs.toFixed(1)}g | Protein: ${protein.toFixed(1)}g`;
}

/**
 * Normalize USDA food data to internal format
 */
function normalizeUSDAFood(food: USDAFoodDetail): NormalizedFood {
  const servings: NormalizedServing[] = [];
  
  // Extract nutrition per 100g (base serving)
  const nutritionPer100g = extractNutrition(food.foodNutrients);

  // Add 100g as default serving
  servings.push({
    id: '100g',
    description: '100g',
    amount: 100,
    unit: 'g',
    nutrition: nutritionPer100g,
    isDefault: true,
  });

  // Add food portions if available
  if (food.foodPortions && food.foodPortions.length > 0) {
    food.foodPortions.forEach((portion, index) => {
      const gramWeight = portion.gramWeight;
      const ratio = gramWeight / 100;
      
      // Scale nutrition by portion weight
      const portionNutrition: Nutrition = {
        calories: nutritionPer100g.calories * ratio,
        protein: nutritionPer100g.protein * ratio,
        carbs: nutritionPer100g.carbs * ratio,
        fat: nutritionPer100g.fat * ratio,
        fiber: (nutritionPer100g.fiber || 0) * ratio,
        sugar: (nutritionPer100g.sugar || 0) * ratio,
        sodium: (nutritionPer100g.sodium || 0) * ratio,
        saturatedFat: (nutritionPer100g.saturatedFat || 0) * ratio,
        cholesterol: (nutritionPer100g.cholesterol || 0) * ratio,
        potassium: (nutritionPer100g.potassium || 0) * ratio,
      };

      const description = portion.portionDescription || 
        `${portion.amount} ${portion.measureUnit?.name || 'serving'}` +
        (portion.modifier ? ` (${portion.modifier})` : '');

      servings.push({
        id: `portion_${portion.id || index}`,
        description: `${description} (${gramWeight}g)`,
        amount: portion.amount,
        unit: portion.measureUnit?.name || 'serving',
        nutrition: portionNutrition,
        isDefault: false,
      });
    });
  }

  // Add serving size if available and different from portions
  if (food.servingSize && food.servingSizeUnit) {
    const ratio = food.servingSize / 100;
    const servingNutrition: Nutrition = {
      calories: nutritionPer100g.calories * ratio,
      protein: nutritionPer100g.protein * ratio,
      carbs: nutritionPer100g.carbs * ratio,
      fat: nutritionPer100g.fat * ratio,
      fiber: (nutritionPer100g.fiber || 0) * ratio,
      sugar: (nutritionPer100g.sugar || 0) * ratio,
      sodium: (nutritionPer100g.sodium || 0) * ratio,
      saturatedFat: (nutritionPer100g.saturatedFat || 0) * ratio,
      cholesterol: (nutritionPer100g.cholesterol || 0) * ratio,
      potassium: (nutritionPer100g.potassium || 0) * ratio,
    };

    servings.push({
      id: 'serving',
      description: `${food.servingSize}${food.servingSizeUnit}`,
      amount: food.servingSize,
      unit: food.servingSizeUnit,
      nutrition: servingNutrition,
      isDefault: false,
    });
  }

  return {
    id: String(food.fdcId),
    name: food.description,
    brand: food.brandOwner || food.brandName,
    source: 'usda' as const,
    servings,
  };
}

/**
 * Extract nutrition from USDA nutrient array
 */
function extractNutrition(nutrients: USDADetailNutrient[]): Nutrition {
  const getValue = (nutrientId: number): number => {
    const nutrient = nutrients.find(n => n.nutrient?.id === nutrientId);
    return nutrient?.amount ?? 0;
  };

  return {
    calories: getValue(NUTRIENT_IDS.calories),
    protein: getValue(NUTRIENT_IDS.protein),
    carbs: getValue(NUTRIENT_IDS.carbs),
    fat: getValue(NUTRIENT_IDS.fat),
    fiber: getValue(NUTRIENT_IDS.fiber),
    sugar: getValue(NUTRIENT_IDS.sugar),
    sodium: getValue(NUTRIENT_IDS.sodium),
    saturatedFat: getValue(NUTRIENT_IDS.saturatedFat),
    cholesterol: getValue(NUTRIENT_IDS.cholesterol),
    potassium: getValue(NUTRIENT_IDS.potassium),
  };
}
