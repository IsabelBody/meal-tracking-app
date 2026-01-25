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
  // Extended fields from USDA
  ingredients?: string;
  foodCategory?: string;
  scientificName?: string;
  gtinUpc?: string;
  dataType?: 'Foundation' | 'SR Legacy' | 'Branded' | 'Survey (FNDDS)';
}

export interface NormalizedServing {
  id: string;
  description: string;
  amount: number;
  unit: string;
  nutrition: Nutrition;
  isDefault?: boolean;
}

/**
 * Comprehensive nutrition interface with all USDA FoodData Central nutrients
 * Nutrient IDs from USDA API are documented in comments
 */
export interface Nutrition {
  // === Core Macronutrients ===
  calories: number;           // 1008 - Energy (kcal)
  protein: number;            // 1003 - Protein (g)
  carbs: number;              // 1005 - Carbohydrate, by difference (g)
  fat: number;                // 1004 - Total lipid (fat) (g)

  // === Additional Macros ===
  fiber?: number;             // 1079 - Fiber, total dietary (g)
  sugar?: number;             // 2000 - Sugars, total (g)
  addedSugars?: number;       // 1235 - Sugars, added (g)
  alcohol?: number;           // 1018 - Alcohol, ethyl (g)
  water?: number;             // 1051 - Water (g)

  // === Fats & Fatty Acids ===
  saturatedFat?: number;      // 1258 - Fatty acids, total saturated (g)
  monounsaturatedFat?: number; // 1292 - Fatty acids, total monounsaturated (g)
  polyunsaturatedFat?: number; // 1293 - Fatty acids, total polyunsaturated (g)
  transFat?: number;          // 1257 - Fatty acids, total trans (g)
  cholesterol?: number;       // 1253 - Cholesterol (mg)
  omega3?: number;            // Calculated: EPA + DHA + ALA
  omega6?: number;            // 1316 - 18:2 n-6 c,c (linoleic) (g)

  // === Minerals ===
  sodium?: number;            // 1093 - Sodium, Na (mg)
  potassium?: number;         // 1092 - Potassium, K (mg)
  calcium?: number;           // 1087 - Calcium, Ca (mg)
  iron?: number;              // 1089 - Iron, Fe (mg)
  magnesium?: number;         // 1090 - Magnesium, Mg (mg)
  phosphorus?: number;        // 1091 - Phosphorus, P (mg)
  zinc?: number;              // 1095 - Zinc, Zn (mg)
  copper?: number;            // 1098 - Copper, Cu (mg)
  manganese?: number;         // 1101 - Manganese, Mn (mg)
  selenium?: number;          // 1103 - Selenium, Se (mcg)

  // === Fat-Soluble Vitamins ===
  vitaminA?: number;          // 1106 - Vitamin A, RAE (mcg)
  vitaminD?: number;          // 1114 - Vitamin D (D2 + D3) (mcg)
  vitaminE?: number;          // 1109 - Vitamin E (alpha-tocopherol) (mg)
  vitaminK?: number;          // 1185 - Vitamin K (phylloquinone) (mcg)

  // === Water-Soluble Vitamins ===
  vitaminC?: number;          // 1162 - Vitamin C, total ascorbic acid (mg)
  thiamin?: number;           // 1165 - Thiamin (B1) (mg)
  riboflavin?: number;        // 1166 - Riboflavin (B2) (mg)
  niacin?: number;            // 1167 - Niacin (B3) (mg)
  pantothenicAcid?: number;   // 1170 - Pantothenic acid (B5) (mg)
  vitaminB6?: number;         // 1175 - Vitamin B-6 (mg)
  biotin?: number;            // 1176 - Biotin (B7) (mcg)
  folate?: number;            // 1177 - Folate, total (mcg)
  folicAcid?: number;         // 1186 - Folic acid (mcg)
  folateDFE?: number;         // 1190 - Folate, DFE (mcg)
  vitaminB12?: number;        // 1178 - Vitamin B-12 (mcg)
  choline?: number;           // 1180 - Choline, total (mg)

  // === Carotenoids (Vitamin A precursors) ===
  betaCarotene?: number;      // 1107 - Carotene, beta (mcg)
  alphaCarotene?: number;     // 1108 - Carotene, alpha (mcg)
  lycopene?: number;          // 1122 - Lycopene (mcg)
  luteinZeaxanthin?: number;  // 1123 - Lutein + zeaxanthin (mcg)
  cryptoxanthin?: number;     // 1120 - Cryptoxanthin, beta (mcg)
  retinol?: number;           // 1105 - Retinol (mcg)

  // === Other Compounds ===
  caffeine?: number;          // 1057 - Caffeine (mg)
  theobromine?: number;       // 1058 - Theobromine (mg)
}

/**
 * Categories for organizing nutrition display
 */
export type NutrientCategory =
  | 'macros'
  | 'fats'
  | 'minerals'
  | 'vitamins'
  | 'carotenoids'
  | 'other';

/**
 * Nutrient metadata for display purposes
 */
export interface NutrientMeta {
  key: keyof Nutrition;
  label: string;
  unit: string;
  category: NutrientCategory;
  dailyValue?: number; // FDA Daily Value for % calculation
}

/**
 * Complete nutrient metadata for all nutrients
 */
export const NUTRIENT_METADATA: NutrientMeta[] = [
  // Macros
  { key: 'calories', label: 'Calories', unit: 'kcal', category: 'macros', dailyValue: 2000 },
  { key: 'protein', label: 'Protein', unit: 'g', category: 'macros', dailyValue: 50 },
  { key: 'carbs', label: 'Carbohydrates', unit: 'g', category: 'macros', dailyValue: 275 },
  { key: 'fat', label: 'Total Fat', unit: 'g', category: 'macros', dailyValue: 78 },
  { key: 'fiber', label: 'Dietary Fiber', unit: 'g', category: 'macros', dailyValue: 28 },
  { key: 'sugar', label: 'Total Sugars', unit: 'g', category: 'macros' },
  { key: 'addedSugars', label: 'Added Sugars', unit: 'g', category: 'macros', dailyValue: 50 },

  // Fats
  { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g', category: 'fats', dailyValue: 20 },
  { key: 'monounsaturatedFat', label: 'Monounsaturated Fat', unit: 'g', category: 'fats' },
  { key: 'polyunsaturatedFat', label: 'Polyunsaturated Fat', unit: 'g', category: 'fats' },
  { key: 'transFat', label: 'Trans Fat', unit: 'g', category: 'fats' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', category: 'fats', dailyValue: 300 },
  { key: 'omega3', label: 'Omega-3', unit: 'g', category: 'fats' },
  { key: 'omega6', label: 'Omega-6', unit: 'g', category: 'fats' },

  // Minerals
  { key: 'sodium', label: 'Sodium', unit: 'mg', category: 'minerals', dailyValue: 2300 },
  { key: 'potassium', label: 'Potassium', unit: 'mg', category: 'minerals', dailyValue: 4700 },
  { key: 'calcium', label: 'Calcium', unit: 'mg', category: 'minerals', dailyValue: 1300 },
  { key: 'iron', label: 'Iron', unit: 'mg', category: 'minerals', dailyValue: 18 },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg', category: 'minerals', dailyValue: 420 },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg', category: 'minerals', dailyValue: 1250 },
  { key: 'zinc', label: 'Zinc', unit: 'mg', category: 'minerals', dailyValue: 11 },
  { key: 'copper', label: 'Copper', unit: 'mg', category: 'minerals', dailyValue: 0.9 },
  { key: 'manganese', label: 'Manganese', unit: 'mg', category: 'minerals', dailyValue: 2.3 },
  { key: 'selenium', label: 'Selenium', unit: 'mcg', category: 'minerals', dailyValue: 55 },

  // Fat-Soluble Vitamins
  { key: 'vitaminA', label: 'Vitamin A', unit: 'mcg', category: 'vitamins', dailyValue: 900 },
  { key: 'vitaminD', label: 'Vitamin D', unit: 'mcg', category: 'vitamins', dailyValue: 20 },
  { key: 'vitaminE', label: 'Vitamin E', unit: 'mg', category: 'vitamins', dailyValue: 15 },
  { key: 'vitaminK', label: 'Vitamin K', unit: 'mcg', category: 'vitamins', dailyValue: 120 },

  // Water-Soluble Vitamins
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg', category: 'vitamins', dailyValue: 90 },
  { key: 'thiamin', label: 'Thiamin (B1)', unit: 'mg', category: 'vitamins', dailyValue: 1.2 },
  { key: 'riboflavin', label: 'Riboflavin (B2)', unit: 'mg', category: 'vitamins', dailyValue: 1.3 },
  { key: 'niacin', label: 'Niacin (B3)', unit: 'mg', category: 'vitamins', dailyValue: 16 },
  { key: 'pantothenicAcid', label: 'Pantothenic Acid (B5)', unit: 'mg', category: 'vitamins', dailyValue: 5 },
  { key: 'vitaminB6', label: 'Vitamin B6', unit: 'mg', category: 'vitamins', dailyValue: 1.7 },
  { key: 'biotin', label: 'Biotin (B7)', unit: 'mcg', category: 'vitamins', dailyValue: 30 },
  { key: 'folate', label: 'Folate', unit: 'mcg', category: 'vitamins', dailyValue: 400 },
  { key: 'vitaminB12', label: 'Vitamin B12', unit: 'mcg', category: 'vitamins', dailyValue: 2.4 },
  { key: 'choline', label: 'Choline', unit: 'mg', category: 'vitamins', dailyValue: 550 },

  // Carotenoids
  { key: 'betaCarotene', label: 'Beta-Carotene', unit: 'mcg', category: 'carotenoids' },
  { key: 'alphaCarotene', label: 'Alpha-Carotene', unit: 'mcg', category: 'carotenoids' },
  { key: 'lycopene', label: 'Lycopene', unit: 'mcg', category: 'carotenoids' },
  { key: 'luteinZeaxanthin', label: 'Lutein + Zeaxanthin', unit: 'mcg', category: 'carotenoids' },
  { key: 'cryptoxanthin', label: 'Beta-Cryptoxanthin', unit: 'mcg', category: 'carotenoids' },
  { key: 'retinol', label: 'Retinol', unit: 'mcg', category: 'carotenoids' },

  // Other
  { key: 'caffeine', label: 'Caffeine', unit: 'mg', category: 'other' },
  { key: 'theobromine', label: 'Theobromine', unit: 'mg', category: 'other' },
  { key: 'water', label: 'Water', unit: 'g', category: 'other' },
  { key: 'alcohol', label: 'Alcohol', unit: 'g', category: 'other' },
];
