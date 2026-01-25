/**
 * USDA FoodData Central API Service
 * 
 * Full utilization of all available nutrients, ingredients, and metadata.
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
  gtinUpc?: string;
  brandedFoodCategory?: string;
  scientificName?: string;
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
  // Extended fields
  gtinUpc?: string;
  brandedFoodCategory?: string;
  scientificName?: string;
  foodCategory?: {
    id: number;
    code: string;
    description: string;
  };
  labelNutrients?: {
    fat?: { value: number };
    saturatedFat?: { value: number };
    transFat?: { value: number };
    cholesterol?: { value: number };
    sodium?: { value: number };
    carbohydrates?: { value: number };
    fiber?: { value: number };
    sugars?: { value: number };
    protein?: { value: number };
    calcium?: { value: number };
    iron?: { value: number };
    potassium?: { value: number };
    calories?: { value: number };
  };
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

/**
 * Complete USDA Nutrient ID mapping
 * https://fdc.nal.usda.gov/api-guide.html
 */
const NUTRIENT_IDS = {
  // === Core Macronutrients ===
  calories: 1008,           // Energy (kcal)
  protein: 1003,            // Protein (g)
  carbs: 1005,              // Carbohydrate, by difference (g)
  fat: 1004,                // Total lipid (fat) (g)

  // === Additional Macros ===
  fiber: 1079,              // Fiber, total dietary (g)
  sugar: 2000,              // Sugars, total including NLEA (g)
  addedSugars: 1235,        // Sugars, added (g)
  alcohol: 1018,            // Alcohol, ethyl (g)
  water: 1051,              // Water (g)

  // === Fats & Fatty Acids ===
  saturatedFat: 1258,       // Fatty acids, total saturated (g)
  monounsaturatedFat: 1292, // Fatty acids, total monounsaturated (g)
  polyunsaturatedFat: 1293, // Fatty acids, total polyunsaturated (g)
  transFat: 1257,           // Fatty acids, total trans (g)
  cholesterol: 1253,        // Cholesterol (mg)
  
  // Omega fatty acids (for calculating omega-3)
  epa: 1278,                // 20:5 n-3 (EPA) (g)
  dha: 1272,                // 22:6 n-3 (DHA) (g)
  ala: 1404,                // 18:3 n-3 c,c,c (ALA) (g)
  omega6: 1316,             // 18:2 n-6 c,c (linoleic) (g)

  // === Minerals ===
  sodium: 1093,             // Sodium, Na (mg)
  potassium: 1092,          // Potassium, K (mg)
  calcium: 1087,            // Calcium, Ca (mg)
  iron: 1089,               // Iron, Fe (mg)
  magnesium: 1090,          // Magnesium, Mg (mg)
  phosphorus: 1091,         // Phosphorus, P (mg)
  zinc: 1095,               // Zinc, Zn (mg)
  copper: 1098,             // Copper, Cu (mg)
  manganese: 1101,          // Manganese, Mn (mg)
  selenium: 1103,           // Selenium, Se (mcg)

  // === Fat-Soluble Vitamins ===
  vitaminA: 1106,           // Vitamin A, RAE (mcg)
  vitaminD: 1114,           // Vitamin D (D2 + D3) (mcg)
  vitaminE: 1109,           // Vitamin E (alpha-tocopherol) (mg)
  vitaminK: 1185,           // Vitamin K (phylloquinone) (mcg)

  // === Water-Soluble Vitamins ===
  vitaminC: 1162,           // Vitamin C, total ascorbic acid (mg)
  thiamin: 1165,            // Thiamin (mg)
  riboflavin: 1166,         // Riboflavin (mg)
  niacin: 1167,             // Niacin (mg)
  pantothenicAcid: 1170,    // Pantothenic acid (mg)
  vitaminB6: 1175,          // Vitamin B-6 (mg)
  biotin: 1176,             // Biotin (mcg)
  folate: 1177,             // Folate, total (mcg)
  folicAcid: 1186,          // Folic acid (mcg)
  folateDFE: 1190,          // Folate, DFE (mcg)
  vitaminB12: 1178,         // Vitamin B-12 (mcg)
  choline: 1180,            // Choline, total (mg)

  // === Carotenoids ===
  betaCarotene: 1107,       // Carotene, beta (mcg)
  alphaCarotene: 1108,      // Carotene, alpha (mcg)
  lycopene: 1122,           // Lycopene (mcg)
  luteinZeaxanthin: 1123,   // Lutein + zeaxanthin (mcg)
  cryptoxanthin: 1120,      // Cryptoxanthin, beta (mcg)
  retinol: 1105,            // Retinol (mcg)

  // === Other Compounds ===
  caffeine: 1057,           // Caffeine (mg)
  theobromine: 1058,        // Theobromine (mg)
} as const;

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
 * Scale nutrition values by a ratio
 */
function scaleNutritionByRatio(nutrition: Nutrition, ratio: number): Nutrition {
  const scaled: Nutrition = {
    calories: nutrition.calories * ratio,
    protein: nutrition.protein * ratio,
    carbs: nutrition.carbs * ratio,
    fat: nutrition.fat * ratio,
  };

  // Scale all optional fields
  const optionalFields: (keyof Nutrition)[] = [
    'fiber', 'sugar', 'addedSugars', 'alcohol', 'water',
    'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat', 'transFat', 'cholesterol', 'omega3', 'omega6',
    'sodium', 'potassium', 'calcium', 'iron', 'magnesium', 'phosphorus', 'zinc', 'copper', 'manganese', 'selenium',
    'vitaminA', 'vitaminD', 'vitaminE', 'vitaminK',
    'vitaminC', 'thiamin', 'riboflavin', 'niacin', 'pantothenicAcid', 'vitaminB6', 'biotin', 'folate', 'folicAcid', 'folateDFE', 'vitaminB12', 'choline',
    'betaCarotene', 'alphaCarotene', 'lycopene', 'luteinZeaxanthin', 'cryptoxanthin', 'retinol',
    'caffeine', 'theobromine',
  ];

  for (const field of optionalFields) {
    const value = nutrition[field];
    if (value !== undefined && value !== null) {
      (scaled as Record<string, number | undefined>)[field] = (value as number) * ratio;
    }
  }

  return scaled;
}

/**
 * Normalize USDA food data to internal format with full nutrient extraction
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
      
      const portionNutrition = scaleNutritionByRatio(nutritionPer100g, ratio);

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
    const servingNutrition = scaleNutritionByRatio(nutritionPer100g, ratio);

    servings.push({
      id: 'serving',
      description: `${food.servingSize}${food.servingSizeUnit}`,
      amount: food.servingSize,
      unit: food.servingSizeUnit,
      nutrition: servingNutrition,
      isDefault: false,
    });
  }

  // Determine food category
  const foodCategory = food.brandedFoodCategory || food.foodCategory?.description;

  // Determine data type for display
  const dataType = food.dataType as NormalizedFood['dataType'];

  return {
    id: String(food.fdcId),
    name: food.description,
    brand: food.brandOwner || food.brandName,
    source: 'usda' as const,
    servings,
    // Extended fields
    ingredients: food.ingredients,
    foodCategory,
    scientificName: food.scientificName,
    gtinUpc: food.gtinUpc,
    dataType,
  };
}

/**
 * Extract all available nutrition from USDA nutrient array
 */
function extractNutrition(nutrients: USDADetailNutrient[]): Nutrition {
  const getValue = (nutrientId: number): number | undefined => {
    const nutrient = nutrients.find(n => n.nutrient?.id === nutrientId);
    return nutrient?.amount;
  };

  const getValueOrZero = (nutrientId: number): number => {
    return getValue(nutrientId) ?? 0;
  };

  // Calculate omega-3 as sum of EPA, DHA, and ALA
  const epa = getValue(NUTRIENT_IDS.epa) ?? 0;
  const dha = getValue(NUTRIENT_IDS.dha) ?? 0;
  const ala = getValue(NUTRIENT_IDS.ala) ?? 0;
  const omega3Total = epa + dha + ala;

  return {
    // === Core Macronutrients ===
    calories: getValueOrZero(NUTRIENT_IDS.calories),
    protein: getValueOrZero(NUTRIENT_IDS.protein),
    carbs: getValueOrZero(NUTRIENT_IDS.carbs),
    fat: getValueOrZero(NUTRIENT_IDS.fat),

    // === Additional Macros ===
    fiber: getValue(NUTRIENT_IDS.fiber),
    sugar: getValue(NUTRIENT_IDS.sugar),
    addedSugars: getValue(NUTRIENT_IDS.addedSugars),
    alcohol: getValue(NUTRIENT_IDS.alcohol),
    water: getValue(NUTRIENT_IDS.water),

    // === Fats & Fatty Acids ===
    saturatedFat: getValue(NUTRIENT_IDS.saturatedFat),
    monounsaturatedFat: getValue(NUTRIENT_IDS.monounsaturatedFat),
    polyunsaturatedFat: getValue(NUTRIENT_IDS.polyunsaturatedFat),
    transFat: getValue(NUTRIENT_IDS.transFat),
    cholesterol: getValue(NUTRIENT_IDS.cholesterol),
    omega3: omega3Total > 0 ? omega3Total : undefined,
    omega6: getValue(NUTRIENT_IDS.omega6),

    // === Minerals ===
    sodium: getValue(NUTRIENT_IDS.sodium),
    potassium: getValue(NUTRIENT_IDS.potassium),
    calcium: getValue(NUTRIENT_IDS.calcium),
    iron: getValue(NUTRIENT_IDS.iron),
    magnesium: getValue(NUTRIENT_IDS.magnesium),
    phosphorus: getValue(NUTRIENT_IDS.phosphorus),
    zinc: getValue(NUTRIENT_IDS.zinc),
    copper: getValue(NUTRIENT_IDS.copper),
    manganese: getValue(NUTRIENT_IDS.manganese),
    selenium: getValue(NUTRIENT_IDS.selenium),

    // === Fat-Soluble Vitamins ===
    vitaminA: getValue(NUTRIENT_IDS.vitaminA),
    vitaminD: getValue(NUTRIENT_IDS.vitaminD),
    vitaminE: getValue(NUTRIENT_IDS.vitaminE),
    vitaminK: getValue(NUTRIENT_IDS.vitaminK),

    // === Water-Soluble Vitamins ===
    vitaminC: getValue(NUTRIENT_IDS.vitaminC),
    thiamin: getValue(NUTRIENT_IDS.thiamin),
    riboflavin: getValue(NUTRIENT_IDS.riboflavin),
    niacin: getValue(NUTRIENT_IDS.niacin),
    pantothenicAcid: getValue(NUTRIENT_IDS.pantothenicAcid),
    vitaminB6: getValue(NUTRIENT_IDS.vitaminB6),
    biotin: getValue(NUTRIENT_IDS.biotin),
    folate: getValue(NUTRIENT_IDS.folate),
    folicAcid: getValue(NUTRIENT_IDS.folicAcid),
    folateDFE: getValue(NUTRIENT_IDS.folateDFE),
    vitaminB12: getValue(NUTRIENT_IDS.vitaminB12),
    choline: getValue(NUTRIENT_IDS.choline),

    // === Carotenoids ===
    betaCarotene: getValue(NUTRIENT_IDS.betaCarotene),
    alphaCarotene: getValue(NUTRIENT_IDS.alphaCarotene),
    lycopene: getValue(NUTRIENT_IDS.lycopene),
    luteinZeaxanthin: getValue(NUTRIENT_IDS.luteinZeaxanthin),
    cryptoxanthin: getValue(NUTRIENT_IDS.cryptoxanthin),
    retinol: getValue(NUTRIENT_IDS.retinol),

    // === Other Compounds ===
    caffeine: getValue(NUTRIENT_IDS.caffeine),
    theobromine: getValue(NUTRIENT_IDS.theobromine),
  };
}
