/**
 * Diary API Service
 *
 * Handles cloud sync for diary entries and goals with the AWS backend.
 */

import { DiaryEntry, NutritionGoals } from '../../types';
import { apiRequest, ApiResponse } from './base';

// ==================== DIARY ENDPOINTS ====================

export interface CloudDiaryEntry {
  userId: string;
  entryKey: string;
  entryId: string;
  date: string;
  mealType: string;
  foodId: string;
  foodName: string;
  brandName?: string;
  servingId: string;
  servingAmount: number;
  servingUnit: string;
  servingDescription?: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  source: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get diary entries for a specific date
 */
export async function getDiaryEntries(
  date: string,
  token: string
): Promise<ApiResponse<{ entries: CloudDiaryEntry[] }>> {
  return apiRequest(`/diary?date=${encodeURIComponent(date)}`, {
    method: 'GET',
    token,
  });
}

/**
 * Create a new diary entry
 */
export async function createDiaryEntry(
  entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>,
  token: string
): Promise<ApiResponse<CloudDiaryEntry>> {
  return apiRequest('/diary', {
    method: 'POST',
    token,
    body: JSON.stringify(entry),
  });
}

/**
 * Update a diary entry (serving, nutrition)
 */
export interface DiaryEntryUpdate {
  servingId?: string;
  servingAmount?: number;
  servingUnit?: string;
  servingDescription?: string;
  nutrition?: { calories: number; protein: number; carbs: number; fat: number; fiber?: number; sugar?: number; sodium?: number };
}

export async function updateDiaryEntry(
  entryKey: string,
  updates: DiaryEntryUpdate,
  token: string
): Promise<ApiResponse<CloudDiaryEntry>> {
  return apiRequest(`/diary/${encodeURIComponent(entryKey)}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a diary entry
 */
export async function deleteDiaryEntry(
  entryKey: string,
  token: string
): Promise<ApiResponse<void>> {
  return apiRequest(`/diary/${encodeURIComponent(entryKey)}`, {
    method: 'DELETE',
    token,
  });
}

// ==================== GOALS ENDPOINTS ====================

export interface CloudGoals {
  userId?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  updatedAt?: string;
}

export interface CloudProfile {
  unitSystem?: 'metric' | 'imperial';
  name?: string;
  email?: string;
  gender?: 'male' | 'female';
  weight?: number;
  height?: number;
  age?: number;
  activityLevel?: string;
  weightGoal?: string;
}

export interface CloudGoalsResponse {
  goals: CloudGoals;
  profile: CloudProfile;
  avoidedIngredients: Array< { id: string; term: string; enabled: boolean; isDefault: boolean } >;
}

/**
 * Get user goals, profile, and avoided ingredients
 */
export async function getGoals(token: string): Promise<ApiResponse<CloudGoalsResponse>> {
  return apiRequest('/goals', {
    method: 'GET',
    token,
  });
}

export interface UpdateGoalsPayload {
  goals?: Partial<NutritionGoals>;
  profile?: Partial<CloudProfile>;
  avoidedIngredients?: Array<{ id: string; term: string; enabled: boolean; isDefault: boolean }>;
}

/**
 * Update user goals, profile, and/or avoided ingredients (merge with existing)
 */
export async function updateGoals(
  payload: UpdateGoalsPayload | Partial<NutritionGoals>,
  token: string
): Promise<ApiResponse<CloudGoalsResponse>> {
  const hasNewShape =
    typeof (payload as UpdateGoalsPayload).goals !== 'undefined' ||
    typeof (payload as UpdateGoalsPayload).profile !== 'undefined' ||
    typeof (payload as UpdateGoalsPayload).avoidedIngredients !== 'undefined';
  const body = hasNewShape ? (payload as UpdateGoalsPayload) : { goals: payload as Partial<NutritionGoals> };
  return apiRequest('/goals', {
    method: 'PUT',
    token,
    body: JSON.stringify(body),
  });
}

// ==================== SYNC UTILITIES ====================

/**
 * Convert cloud entry to local format
 */
export function cloudToLocalEntry(cloud: CloudDiaryEntry): DiaryEntry {
  return {
    id: cloud.entryId,
    date: cloud.date,
    mealType: cloud.mealType as DiaryEntry['mealType'],
    foodId: cloud.foodId,
    foodName: cloud.foodName,
    brandName: cloud.brandName,
    servingId: cloud.servingId,
    servingAmount: cloud.servingAmount,
    servingUnit: cloud.servingUnit,
    servingDescription: cloud.servingDescription || '',
    nutrition: {
      calories: cloud.nutrition.calories,
      protein: cloud.nutrition.protein,
      carbs: cloud.nutrition.carbs,
      fat: cloud.nutrition.fat,
      fiber: cloud.nutrition.fiber,
      sugar: cloud.nutrition.sugar,
      sodium: cloud.nutrition.sodium,
    },
    source: cloud.source as DiaryEntry['source'],
    createdAt: cloud.createdAt,
    updatedAt: cloud.updatedAt,
    // Cloud sync fields
    cloudEntryKey: cloud.entryKey,
    synced: true,
  };
}

/**
 * Convert local entry to cloud format for creation
 */
export function localToCloudEntry(
  local: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>
): Record<string, any> {
  return {
    date: local.date,
    mealType: local.mealType,
    foodId: local.foodId,
    foodName: local.foodName,
    brandName: local.brandName,
    servingId: local.servingId,
    servingAmount: local.servingAmount,
    servingUnit: local.servingUnit,
    servingDescription: local.servingDescription,
    nutrition: local.nutrition,
    source: local.source,
  };
}
