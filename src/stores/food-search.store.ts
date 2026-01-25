import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { FoodSearchResult, NormalizedFood } from '../types';

interface FoodCache {
  data: NormalizedFood;
  cachedAt: number;
}

interface SearchCache {
  query: string;
  results: FoodSearchResult[];
  cachedAt: number;
}

interface FoodSearchState {
  // Search state
  query: string;
  results: FoodSearchResult[];
  isSearching: boolean;
  searchError: string | null;
  totalResults: number;
  currentPage: number;

  // Selected food
  selectedFood: NormalizedFood | null;
  isLoadingFood: boolean;
  foodError: string | null;

  // History & Favorites
  recentSearches: string[];
  recentFoods: FoodSearchResult[];
  favoriteFoods: FoodSearchResult[];

  // Cache
  foodCache: Record<string, FoodCache>;
  searchCache: Record<string, SearchCache>;

  // Actions
  setQuery: (query: string) => void;
  setResults: (results: FoodSearchResult[], totalResults: number, page: number) => void;
  setSearching: (isSearching: boolean) => void;
  setSearchError: (error: string | null) => void;
  clearSearch: () => void;

  setSelectedFood: (food: NormalizedFood | null) => void;
  setLoadingFood: (isLoading: boolean) => void;
  setFoodError: (error: string | null) => void;

  addRecentSearch: (query: string) => void;
  addRecentFood: (food: FoodSearchResult) => void;
  addFavorite: (food: FoodSearchResult) => void;
  removeFavorite: (foodId: string) => void;
  isFavorite: (foodId: string) => boolean;

  // Cache operations
  getCachedFood: (foodId: string) => NormalizedFood | null;
  setCachedFood: (foodId: string, food: NormalizedFood) => void;
  getCachedSearch: (query: string) => FoodSearchResult[] | null;
  setCachedSearch: (query: string, results: FoodSearchResult[]) => void;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RECENT_SEARCHES = 10;
const MAX_RECENT_FOODS = 20;

export const useFoodSearchStore = create<FoodSearchState>()(
  persist(
    (set, get) => ({
      // Initial state
      query: '',
      results: [],
      isSearching: false,
      searchError: null,
      totalResults: 0,
      currentPage: 0,

      selectedFood: null,
      isLoadingFood: false,
      foodError: null,

      recentSearches: [],
      recentFoods: [],
      favoriteFoods: [],

      foodCache: {},
      searchCache: {},

      // Search actions
      setQuery: (query) => set({ query }),

      setResults: (results, totalResults, page) =>
        set({ results, totalResults, currentPage: page, searchError: null }),

      setSearching: (isSearching) => set({ isSearching }),

      setSearchError: (searchError) => set({ searchError, isSearching: false }),

      clearSearch: () =>
        set({
          query: '',
          results: [],
          searchError: null,
          totalResults: 0,
          currentPage: 0,
        }),

      // Selected food actions
      setSelectedFood: (selectedFood) => set({ selectedFood, foodError: null }),

      setLoadingFood: (isLoadingFood) => set({ isLoadingFood }),

      setFoodError: (foodError) => set({ foodError, isLoadingFood: false }),

      // History & Favorites
      addRecentSearch: (query) => {
        const trimmed = query.trim().toLowerCase();
        if (!trimmed) return;

        set((state) => {
          const filtered = state.recentSearches.filter(
            (s) => s.toLowerCase() !== trimmed
          );
          return {
            recentSearches: [query.trim(), ...filtered].slice(
              0,
              MAX_RECENT_SEARCHES
            ),
          };
        });
      },

      addRecentFood: (food) => {
        set((state) => {
          const filtered = state.recentFoods.filter(
            (f) => f.food_id !== food.food_id
          );
          return {
            recentFoods: [food, ...filtered].slice(0, MAX_RECENT_FOODS),
          };
        });
      },

      addFavorite: (food) => {
        set((state) => {
          if (state.favoriteFoods.some((f) => f.food_id === food.food_id)) {
            return state;
          }
          return {
            favoriteFoods: [...state.favoriteFoods, food],
          };
        });
      },

      removeFavorite: (foodId) => {
        set((state) => ({
          favoriteFoods: state.favoriteFoods.filter((f) => f.food_id !== foodId),
        }));
      },

      isFavorite: (foodId) => {
        return get().favoriteFoods.some((f) => f.food_id === foodId);
      },

      // Cache operations
      getCachedFood: (foodId) => {
        const cached = get().foodCache[foodId];
        if (!cached) return null;
        if (Date.now() - cached.cachedAt > CACHE_TTL) {
          // Expired
          set((state) => {
            const newCache = { ...state.foodCache };
            delete newCache[foodId];
            return { foodCache: newCache };
          });
          return null;
        }
        return cached.data;
      },

      setCachedFood: (foodId, food) => {
        set((state) => ({
          foodCache: {
            ...state.foodCache,
            [foodId]: {
              data: food,
              cachedAt: Date.now(),
            },
          },
        }));
      },

      getCachedSearch: (query) => {
        const key = query.trim().toLowerCase();
        const cached = get().searchCache[key];
        if (!cached) return null;
        if (Date.now() - cached.cachedAt > CACHE_TTL) {
          // Expired
          set((state) => {
            const newCache = { ...state.searchCache };
            delete newCache[key];
            return { searchCache: newCache };
          });
          return null;
        }
        return cached.results;
      },

      setCachedSearch: (query, results) => {
        const key = query.trim().toLowerCase();
        set((state) => ({
          searchCache: {
            ...state.searchCache,
            [key]: {
              query: key,
              results,
              cachedAt: Date.now(),
            },
          },
        }));
      },
    }),
    {
      name: 'meal-tracker-food-search',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist small, essential data - NOT caches (causes slowdown)
      partialize: (state) => ({
        recentSearches: state.recentSearches.slice(0, MAX_RECENT_SEARCHES),
        recentFoods: state.recentFoods.slice(0, MAX_RECENT_FOODS),
        favoriteFoods: state.favoriteFoods,
        // Caches are kept in memory only for performance
      }),
    }
  )
);
