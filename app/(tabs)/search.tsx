import { useState, useCallback, useEffect } from 'react';
import { FlatList, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Input,
  Card,
  Button,
  Spinner,
  Paragraph,
} from 'tamagui';
import { Search, X, Star, Clock, ChevronRight } from '@tamagui/lucide-icons';

import { useFoodSearchStore } from '../../src/stores/food-search.store';
import { searchFoods, parseQuickNutrition } from '../../src/services/api/fatsecret';
import { FoodSearchResult } from '../../src/types';

export default function SearchScreen() {
  const router = useRouter();
  const [localQuery, setLocalQuery] = useState('');
  
  const {
    query,
    results,
    isSearching,
    searchError,
    recentSearches,
    recentFoods,
    favoriteFoods,
    setQuery,
    setResults,
    setSearching,
    setSearchError,
    addRecentSearch,
    getCachedSearch,
    setCachedSearch,
    clearSearch,
  } = useFoodSearchStore();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery.trim().length >= 2) {
        performSearch(localQuery.trim());
      } else if (localQuery.trim().length === 0) {
        clearSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localQuery]);

  const performSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    // Check cache first
    const cached = getCachedSearch(searchQuery);
    if (cached) {
      setResults(cached, cached.length, 0);
      return;
    }

    setSearching(true);
    try {
      const result = await searchFoods(searchQuery);
      setResults(result.foods, result.totalResults, result.pageNumber);
      setCachedSearch(searchQuery, result.foods);
      addRecentSearch(searchQuery);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    }
  };

  const handleFoodPress = (food: FoodSearchResult) => {
    Keyboard.dismiss();
    router.push({
      pathname: '/food/[id]',
      params: { id: food.food_id },
    });
  };

  const handleClear = () => {
    setLocalQuery('');
    clearSearch();
    Keyboard.dismiss();
  };

  const handleRecentSearchPress = (search: string) => {
    setLocalQuery(search);
    performSearch(search);
  };

  const renderFoodItem = ({ item }: { item: FoodSearchResult }) => {
    const quickNutrition = parseQuickNutrition(item.food_description);

    return (
      <Card
        elevate
        bordered
        marginBottom="$2"
        padding="$3"
        backgroundColor="$background"
        pressStyle={{ opacity: 0.8 }}
        onPress={() => handleFoodPress(item)}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <YStack flex={1} marginRight="$2">
            <Text fontWeight="600" fontSize="$4" color="$color" numberOfLines={1}>
              {item.food_name}
            </Text>
            {item.brand_name && (
              <Text fontSize="$2" color="$colorHover">
                {item.brand_name}
              </Text>
            )}
            {quickNutrition && (
              <XStack gap="$2" marginTop="$1">
                <Text fontSize="$2" color="#10B981">
                  {quickNutrition.calories} cal
                </Text>
                <Text fontSize="$2" color="$colorHover">
                  P: {quickNutrition.protein}g
                </Text>
                <Text fontSize="$2" color="$colorHover">
                  C: {quickNutrition.carbs}g
                </Text>
                <Text fontSize="$2" color="$colorHover">
                  F: {quickNutrition.fat}g
                </Text>
              </XStack>
            )}
          </YStack>
          <ChevronRight size={20} color="$colorHover" />
        </XStack>
      </Card>
    );
  };

  const showRecentContent = !query && results.length === 0;

  return (
    <YStack flex={1} backgroundColor="$backgroundHover" padding="$3">
      {/* Search Input */}
      <XStack
        backgroundColor="$background"
        borderRadius="$4"
        paddingHorizontal="$3"
        alignItems="center"
        marginBottom="$3"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <Search size={20} color="$colorHover" />
        <Input
          flex={1}
          placeholder="Search foods..."
          value={localQuery}
          onChangeText={setLocalQuery}
          borderWidth={0}
          backgroundColor="transparent"
          fontSize="$4"
          paddingHorizontal="$2"
        />
        {localQuery.length > 0 && (
          <Button
            size="$2"
            chromeless
            icon={X}
            onPress={handleClear}
          />
        )}
      </XStack>

      {/* Loading State */}
      {isSearching && (
        <YStack alignItems="center" padding="$4">
          <Spinner size="large" color="#10B981" />
          <Text marginTop="$2" color="$colorHover">Searching...</Text>
        </YStack>
      )}

      {/* Error State */}
      {searchError && (
        <Card padding="$3" backgroundColor="#FEE2E2" marginBottom="$3">
          <Text color="#DC2626">{searchError}</Text>
        </Card>
      )}

      {/* Results */}
      {!isSearching && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.food_id}
          renderItem={renderFoodItem}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* No Results */}
      {!isSearching && query && results.length === 0 && !searchError && (
        <YStack alignItems="center" padding="$4">
          <Text color="$colorHover">No foods found for "{query}"</Text>
        </YStack>
      )}

      {/* Recent Searches & Foods */}
      {showRecentContent && (
        <YStack gap="$4">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <YStack>
              <XStack alignItems="center" gap="$2" marginBottom="$2">
                <Clock size={16} color="$colorHover" />
                <Text fontWeight="600" color="$colorHover">Recent Searches</Text>
              </XStack>
              <XStack flexWrap="wrap" gap="$2">
                {recentSearches.slice(0, 5).map((search, index) => (
                  <Button
                    key={index}
                    size="$2"
                    backgroundColor="$background"
                    borderWidth={1}
                    borderColor="$borderColor"
                    onPress={() => handleRecentSearchPress(search)}
                  >
                    {search}
                  </Button>
                ))}
              </XStack>
            </YStack>
          )}

          {/* Favorite Foods */}
          {favoriteFoods.length > 0 && (
            <YStack>
              <XStack alignItems="center" gap="$2" marginBottom="$2">
                <Star size={16} color="#F59E0B" />
                <Text fontWeight="600" color="$colorHover">Favorites</Text>
              </XStack>
              {favoriteFoods.slice(0, 5).map((food) => (
                <Card
                  key={food.food_id}
                  padding="$3"
                  marginBottom="$2"
                  backgroundColor="$background"
                  pressStyle={{ opacity: 0.8 }}
                  onPress={() => handleFoodPress(food)}
                >
                  <Text fontWeight="500" color="$color">{food.food_name}</Text>
                  {food.brand_name && (
                    <Text fontSize="$2" color="$colorHover">{food.brand_name}</Text>
                  )}
                </Card>
              ))}
            </YStack>
          )}

          {/* Recent Foods */}
          {recentFoods.length > 0 && (
            <YStack>
              <XStack alignItems="center" gap="$2" marginBottom="$2">
                <Clock size={16} color="$colorHover" />
                <Text fontWeight="600" color="$colorHover">Recent Foods</Text>
              </XStack>
              {recentFoods.slice(0, 5).map((food) => (
                <Card
                  key={food.food_id}
                  padding="$3"
                  marginBottom="$2"
                  backgroundColor="$background"
                  pressStyle={{ opacity: 0.8 }}
                  onPress={() => handleFoodPress(food)}
                >
                  <Text fontWeight="500" color="$color">{food.food_name}</Text>
                  {food.brand_name && (
                    <Text fontSize="$2" color="$colorHover">{food.brand_name}</Text>
                  )}
                </Card>
              ))}
            </YStack>
          )}

          {/* Empty State */}
          {recentSearches.length === 0 && favoriteFoods.length === 0 && recentFoods.length === 0 && (
            <YStack alignItems="center" padding="$6">
              <Search size={48} color="$colorHover" />
              <Text marginTop="$3" fontSize="$5" fontWeight="600" color="$color">
                Search for Foods
              </Text>
              <Paragraph textAlign="center" color="$colorHover" marginTop="$2">
                Start typing to search our database of foods and their nutrition information.
              </Paragraph>
            </YStack>
          )}
        </YStack>
      )}
    </YStack>
  );
}
