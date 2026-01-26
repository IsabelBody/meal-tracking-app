/**
 * User data API: weight, fasting, saved meals, favorites.
 */

import { apiRequest } from './base';
import type { WeightEntry } from '../../types/weight';
import type { FastingSession } from '../../types/fasting';
import type { SavedMeal } from '../../types/meal';
import type { FoodSearchResult } from '../../types/food';

export async function getWeightEntries(
  token: string,
  from?: string,
  to?: string
) {
  let path = '/weight';
  if (from && to) path += `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  return apiRequest<{ entries: WeightEntry[] }>(path, { method: 'GET', token });
}

export async function upsertWeightEntry(
  entry: { id?: string; date: string; weight: number; unit?: string; notes?: string; createdAt?: string },
  token: string
) {
  return apiRequest<WeightEntry>('/weight', {
    method: 'PUT',
    token,
    body: JSON.stringify(entry),
  });
}

export async function deleteWeightEntry(date: string, token: string) {
  return apiRequest<void>(`/weight/${encodeURIComponent(date)}`, {
    method: 'DELETE',
    token,
  });
}

export async function getFastingSessions(token: string, date?: string) {
  const path = date ? `/fasting?date=${encodeURIComponent(date)}` : '/fasting';
  return apiRequest<{ sessions: FastingSession[] }>(path, { method: 'GET', token });
}

export async function createFastingSession(
  session: { id?: string; startTime: string; endTime?: string | null; goalDuration?: number; date: string },
  token: string
) {
  return apiRequest<FastingSession & { sessionId: string }>('/fasting', {
    method: 'POST',
    token,
    body: JSON.stringify(session),
  });
}

export async function updateFastingSession(
  sessionId: string,
  updates: { startTime?: string; endTime?: string | null; goalDuration?: number },
  token: string
) {
  return apiRequest<FastingSession>(`/fasting/${encodeURIComponent(sessionId)}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(updates),
  });
}

export async function deleteFastingSession(sessionId: string, token: string) {
  return apiRequest<void>(`/fasting/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    token,
  });
}

export async function getSavedMeals(token: string) {
  return apiRequest<{ meals: SavedMeal[] }>('/meals', { method: 'GET', token });
}

export async function createSavedMeal(
  meal: { id?: string; name: string; items: SavedMeal['items']; totalNutrition: SavedMeal['totalNutrition'] },
  token: string
) {
  return apiRequest<SavedMeal>('/meals', {
    method: 'POST',
    token,
    body: JSON.stringify(meal),
  });
}

export async function updateSavedMeal(
  mealId: string,
  updates: { name?: string; items?: SavedMeal['items']; totalNutrition?: SavedMeal['totalNutrition'] },
  token: string
) {
  return apiRequest<SavedMeal>(`/meals/${encodeURIComponent(mealId)}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(updates),
  });
}

export async function deleteSavedMeal(mealId: string, token: string) {
  return apiRequest<void>(`/meals/${encodeURIComponent(mealId)}`, {
    method: 'DELETE',
    token,
  });
}

export async function getFavorites(token: string) {
  return apiRequest<{ favorites: FoodSearchResult[] }>('/favorites', { method: 'GET', token });
}

export async function addFavorite(food: FoodSearchResult, token: string) {
  return apiRequest<FoodSearchResult>('/favorites', {
    method: 'POST',
    token,
    body: JSON.stringify(food),
  });
}

export async function removeFavorite(foodId: string, token: string) {
  return apiRequest<void>(`/favorites/${encodeURIComponent(foodId)}`, {
    method: 'DELETE',
    token,
  });
}
