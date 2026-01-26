/**
 * Avoid Foods Types
 * System for flagging foods containing ingredients the user wants to avoid
 */

export interface AvoidedIngredient {
  id: string;
  term: string;        // The ingredient term to match (e.g., "sugar", "high fructose corn syrup")
  enabled: boolean;    // Whether this term is currently active
  isDefault: boolean;  // Whether this is a system default (vs user-added)
}

/**
 * Default avoided ingredients focused on added sugars
 * These cover common names for added sugars in ingredient lists
 */
export const DEFAULT_AVOIDED_INGREDIENTS: Omit<AvoidedIngredient, 'id'>[] = [
  { term: 'sugar', enabled: true, isDefault: true },
  { term: 'cane sugar', enabled: true, isDefault: true },
  { term: 'brown sugar', enabled: true, isDefault: true },
  { term: 'high fructose corn syrup', enabled: true, isDefault: true },
  { term: 'corn syrup', enabled: true, isDefault: true },
  { term: 'dextrose', enabled: true, isDefault: true },
  { term: 'fructose', enabled: true, isDefault: true },
  { term: 'glucose', enabled: true, isDefault: true },
  { term: 'maltose', enabled: true, isDefault: true },
  { term: 'sucrose', enabled: true, isDefault: true },
  { term: 'molasses', enabled: true, isDefault: true },
  { term: 'honey', enabled: true, isDefault: true },
  { term: 'agave', enabled: true, isDefault: true },
  { term: 'maple syrup', enabled: true, isDefault: true },
  { term: 'coconut sugar', enabled: true, isDefault: true },
  { term: 'turbinado', enabled: true, isDefault: true },
  { term: 'maltodextrin', enabled: true, isDefault: true },
  { term: 'evaporated cane juice', enabled: true, isDefault: true },
  { term: 'invert sugar', enabled: true, isDefault: true },
  { term: 'rice syrup', enabled: true, isDefault: true },
  { term: 'barley malt', enabled: true, isDefault: true },
];

/**
 * Result of checking ingredients against avoid list
 */
export interface AvoidCheckResult {
  hasAvoidedIngredients: boolean;
  matchedTerms: string[];  // Which avoided terms were found
}
