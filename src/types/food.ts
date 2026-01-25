// Food Search Types
export interface FoodSearchResult {
  food_id: string;
  food_name: string;
  food_description: string;
  food_type: 'Generic' | 'Brand';
  brand_name?: string;
  food_url?: string;
}

export interface FoodSearchResponse {
  foods: {
    food: FoodSearchResult | FoodSearchResult[];
    max_results: string;
    total_results: string;
    page_number: string;
  };
}

// Open Food Facts Types
export interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments: {
    'energy-kcal_100g'?: number;
    'energy-kcal_serving'?: number;
    carbohydrates_100g?: number;
    carbohydrates_serving?: number;
    proteins_100g?: number;
    proteins_serving?: number;
    fat_100g?: number;
    fat_serving?: number;
    fiber_100g?: number;
    fiber_serving?: number;
    sugars_100g?: number;
    sugars_serving?: number;
    sodium_100g?: number;
    sodium_serving?: number;
    'saturated-fat_100g'?: number;
    'saturated-fat_serving'?: number;
  };
  image_url?: string;
  image_small_url?: string;
}

export interface OpenFoodFactsResponse {
  status: number;
  status_verbose: string;
  product?: OpenFoodFactsProduct;
}

// Normalized Food Type (used internally)
export interface NormalizedFood {
  id: string;
  name: string;
  brand?: string;
  source: 'openfoodfacts' | 'usda' | 'custom';
  servings: NormalizedServing[];
  imageUrl?: string;
}

export interface NormalizedServing {
  id: string;
  description: string;
  amount: number;
  unit: string;
  nutrition: Nutrition;
  isDefault?: boolean;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  cholesterol?: number;
  potassium?: number;
}
