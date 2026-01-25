import {
  OpenFoodFactsResponse,
  OpenFoodFactsProduct,
  NormalizedFood,
  NormalizedServing,
  Nutrition,
} from '../../types';

const OFF_BASE_URL = 'https://world.openfoodfacts.org/api/v2';

/**
 * Get product by barcode from Open Food Facts
 */
export async function getProductByBarcode(barcode: string): Promise<NormalizedFood | null> {
  try {
    const response = await fetch(
      `${OFF_BASE_URL}/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'MealTracker/1.0.0 - Personal Use',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.statusText}`);
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    return normalizeOpenFoodFactsProduct(data.product, barcode);
  } catch (error) {
    console.error('Open Food Facts error:', error);
    return null;
  }
}

/**
 * Normalize Open Food Facts product to internal format
 */
function normalizeOpenFoodFactsProduct(
  product: OpenFoodFactsProduct,
  barcode: string
): NormalizedFood {
  const servings: NormalizedServing[] = [];

  // Add per 100g serving (always available)
  const per100gNutrition = extractNutritionPer100g(product.nutriments);
  servings.push({
    id: `${barcode}-100g`,
    description: '100g',
    amount: 100,
    unit: 'g',
    nutrition: per100gNutrition,
    isDefault: !product.serving_size,
  });

  // Add per serving if available
  if (product.serving_size) {
    const servingNutrition = extractNutritionPerServing(product.nutriments);
    const servingAmount = product.serving_quantity || 1;
    
    servings.unshift({
      id: `${barcode}-serving`,
      description: product.serving_size,
      amount: servingAmount,
      unit: 'serving',
      nutrition: servingNutrition,
      isDefault: true,
    });
  }

  return {
    id: barcode,
    name: product.product_name || 'Unknown Product',
    brand: product.brands,
    source: 'openfoodfacts',
    servings,
    imageUrl: product.image_small_url || product.image_url,
  };
}

/**
 * Extract nutrition per 100g
 */
function extractNutritionPer100g(nutriments: OpenFoodFactsProduct['nutriments']): Nutrition {
  return {
    calories: nutriments['energy-kcal_100g'] || 0,
    protein: nutriments.proteins_100g || 0,
    carbs: nutriments.carbohydrates_100g || 0,
    fat: nutriments.fat_100g || 0,
    fiber: nutriments.fiber_100g,
    sugar: nutriments.sugars_100g,
    sodium: nutriments.sodium_100g ? nutriments.sodium_100g * 1000 : undefined, // Convert to mg
    saturatedFat: nutriments['saturated-fat_100g'],
  };
}

/**
 * Extract nutrition per serving
 */
function extractNutritionPerServing(nutriments: OpenFoodFactsProduct['nutriments']): Nutrition {
  return {
    calories: nutriments['energy-kcal_serving'] || nutriments['energy-kcal_100g'] || 0,
    protein: nutriments.proteins_serving || nutriments.proteins_100g || 0,
    carbs: nutriments.carbohydrates_serving || nutriments.carbohydrates_100g || 0,
    fat: nutriments.fat_serving || nutriments.fat_100g || 0,
    fiber: nutriments.fiber_serving || nutriments.fiber_100g,
    sugar: nutriments.sugars_serving || nutriments.sugars_100g,
    sodium: nutriments.sodium_serving 
      ? nutriments.sodium_serving * 1000 
      : nutriments.sodium_100g 
        ? nutriments.sodium_100g * 1000 
        : undefined,
    saturatedFat: nutriments['saturated-fat_serving'] || nutriments['saturated-fat_100g'],
  };
}

/**
 * Search products by name (limited functionality)
 * Note: Open Food Facts search is less reliable than FatSecret
 */
export async function searchProducts(query: string, page: number = 1): Promise<NormalizedFood[]> {
  try {
    const response = await fetch(
      `${OFF_BASE_URL}/search?search_terms=${encodeURIComponent(query)}&page=${page}&page_size=20&json=1`,
      {
        headers: {
          'User-Agent': 'MealTracker/1.0.0 - Personal Use',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Open Food Facts search error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.products || data.products.length === 0) {
      return [];
    }

    return data.products
      .filter((p: any) => p.product_name && p.nutriments)
      .map((p: any) => normalizeOpenFoodFactsProduct(p, p.code));
  } catch (error) {
    console.error('Open Food Facts search error:', error);
    return [];
  }
}
