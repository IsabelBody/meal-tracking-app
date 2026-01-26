/**
 * Portion Size Equivalents Utility
 * 
 * Converts gram measurements to familiar visual comparisons (tablespoon, handful, fist, bowl)
 * based on food density type derived from USDA food categories.
 */

export type DensityType = 'liquid' | 'light' | 'medium' | 'dense' | 'powder';

/**
 * Maps USDA food categories to density types.
 * Categories are matched using case-insensitive substring matching.
 */
const CATEGORY_DENSITY_MAP: { patterns: string[]; density: DensityType }[] = [
  // Liquids - beverages, milk, soups, sauces
  {
    patterns: [
      'beverage', 'drink', 'juice', 'milk', 'water', 'coffee', 'tea',
      'soup', 'broth', 'sauce', 'gravy', 'syrup', 'oil', 'vinegar',
      'cream', 'yogurt', 'smoothie', 'soda', 'wine', 'beer', 'alcohol',
    ],
    density: 'liquid',
  },
  // Light - leafy vegetables, salads, airy foods
  {
    patterns: [
      'leafy', 'lettuce', 'spinach', 'kale', 'greens', 'salad',
      'cabbage', 'arugula', 'herbs', 'popcorn', 'puffed', 'chips',
      'crisp', 'flakes', 'cereal',
    ],
    density: 'light',
  },
  // Dense - meat, fish, cheese, nuts, concentrated foods
  {
    patterns: [
      'beef', 'pork', 'chicken', 'turkey', 'lamb', 'meat', 'poultry',
      'fish', 'seafood', 'salmon', 'tuna', 'shrimp',
      'cheese', 'butter', 'nut', 'seed', 'almond', 'peanut', 'walnut',
      'chocolate', 'candy', 'dried fruit', 'raisin', 'date',
      'egg', 'tofu', 'tempeh', 'sausage', 'bacon', 'ham',
    ],
    density: 'dense',
  },
  // Powder - flour, sugar, spices, protein powder
  {
    patterns: [
      'flour', 'sugar', 'powder', 'spice', 'seasoning', 'salt',
      'baking', 'cocoa', 'protein powder', 'supplement',
    ],
    density: 'powder',
  },
  // Medium is the fallback - fruits, cooked grains, pasta, bread, vegetables
];

/**
 * Portion equivalent descriptions by density type and gram ranges.
 * Each entry has a maxGrams threshold and description.
 */
const PORTION_EQUIVALENTS: Record<DensityType, { maxGrams: number; description: string }[]> = {
  liquid: [
    { maxGrams: 15, description: 'about 1 tablespoon' },
    { maxGrams: 30, description: 'about 2 tablespoons' },
    { maxGrams: 60, description: 'about 1/4 cup' },
    { maxGrams: 120, description: 'about 1/2 cup' },
    { maxGrams: 240, description: 'about 1 cup' },
    { maxGrams: 480, description: 'about 2 cups' },
    { maxGrams: 720, description: 'about 3 cups' },
    { maxGrams: Infinity, description: 'a large serving' },
  ],
  light: [
    { maxGrams: 10, description: 'a pinch' },
    { maxGrams: 30, description: 'a small handful' },
    { maxGrams: 60, description: 'about 1 cup loosely packed' },
    { maxGrams: 100, description: 'about 2 cups loosely packed' },
    { maxGrams: 150, description: 'a small bowl' },
    { maxGrams: 250, description: 'a medium bowl' },
    { maxGrams: 400, description: 'a large bowl' },
    { maxGrams: Infinity, description: 'a very large serving' },
  ],
  medium: [
    { maxGrams: 15, description: 'about 1 tablespoon' },
    { maxGrams: 30, description: 'about 2 tablespoons' },
    { maxGrams: 60, description: 'a small handful' },
    { maxGrams: 100, description: 'roughly a fist-sized portion' },
    { maxGrams: 150, description: 'about 1 cup' },
    { maxGrams: 250, description: 'a small bowl' },
    { maxGrams: 400, description: 'a medium bowl' },
    { maxGrams: Infinity, description: 'a large serving' },
  ],
  dense: [
    { maxGrams: 15, description: 'about 1 tablespoon' },
    { maxGrams: 30, description: 'a thumb-sized portion' },
    { maxGrams: 60, description: 'about 2 thumb-sized portions' },
    { maxGrams: 85, description: 'roughly a palm-sized portion' },
    { maxGrams: 115, description: 'about a deck of cards' },
    { maxGrams: 170, description: 'a medium portion' },
    { maxGrams: 230, description: 'about two decks of cards' },
    { maxGrams: 340, description: 'a large steak-sized portion' },
    { maxGrams: Infinity, description: 'a very large portion' },
  ],
  powder: [
    { maxGrams: 5, description: 'about 1 teaspoon' },
    { maxGrams: 15, description: 'about 1 tablespoon' },
    { maxGrams: 30, description: 'about 2 tablespoons' },
    { maxGrams: 60, description: 'about 1/4 cup' },
    { maxGrams: 120, description: 'about 1/2 cup' },
    { maxGrams: 240, description: 'about 1 cup' },
    { maxGrams: Infinity, description: 'a large amount' },
  ],
};

/**
 * Determines the density type based on food category string.
 * Falls back to 'medium' if no category matches.
 */
export function getDensityType(foodCategory?: string): DensityType {
  if (!foodCategory) {
    return 'medium';
  }

  const lowerCategory = foodCategory.toLowerCase();

  for (const { patterns, density } of CATEGORY_DENSITY_MAP) {
    for (const pattern of patterns) {
      if (lowerCategory.includes(pattern)) {
        return density;
      }
    }
  }

  return 'medium';
}

/**
 * Gets a human-friendly portion equivalent description for a given weight.
 * 
 * @param grams - The weight in grams
 * @param foodCategory - Optional USDA food category for density-aware comparisons
 * @returns A string describing the portion in familiar terms
 */
export function getPortionEquivalent(grams: number, foodCategory?: string): string {
  if (grams <= 0) {
    return '';
  }

  const density = getDensityType(foodCategory);
  const equivalents = PORTION_EQUIVALENTS[density];

  for (const { maxGrams, description } of equivalents) {
    if (grams <= maxGrams) {
      return description;
    }
  }

  // Fallback (should not reach here due to Infinity)
  return 'a serving';
}

/**
 * Gets the total grams for a serving selection.
 * 
 * @param servingGrams - Grams per single serving
 * @param servingAmount - Number of servings
 * @returns Total grams
 */
export function calculateTotalGrams(servingGrams: number, servingAmount: number): number {
  return servingGrams * servingAmount;
}

/**
 * Combined helper that returns the portion equivalent for a serving selection.
 * 
 * @param servingGrams - Grams per single serving
 * @param servingAmount - Number of servings
 * @param foodCategory - Optional USDA food category
 * @returns A string describing the total portion in familiar terms
 */
export function getServingPortionEquivalent(
  servingGrams: number,
  servingAmount: number,
  foodCategory?: string
): string {
  const totalGrams = calculateTotalGrams(servingGrams, servingAmount);
  return getPortionEquivalent(totalGrams, foodCategory);
}
