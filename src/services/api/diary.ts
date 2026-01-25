/**
 * Diary API Service
 * 
 * Handles cloud sync for diary entries and goals with the AWS backend.
 */

import { DiaryEntry, NutritionGoals } from '../../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { token?: string }
): Promise<ApiResponse<T>> {
  const { token, ...fetchOptions } = options;

  if (!API_URL) {
    return { error: 'API URL not configured' };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `Request failed: ${response.status}` };
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { data: undefined as T };
    }

    const data = await response.json();
    return { data };
  } catch (error: any) {
    console.error('API request error:', error);
    return { error: error.message || 'Network error' };
  }
}

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
  updatedAt?: string;
}

/**
 * Get user goals
 */
export async function getGoals(token: string): Promise<ApiResponse<CloudGoals>> {
  return apiRequest('/goals', {
    method: 'GET',
    token,
  });
}

/**
 * Update user goals
 */
export async function updateGoals(
  goals: Partial<NutritionGoals>,
  token: string
): Promise<ApiResponse<CloudGoals>> {
  return apiRequest('/goals', {
    method: 'PUT',
    token,
    body: JSON.stringify(goals),
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
