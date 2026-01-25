import { Minus, Plus, Star, StarOff } from '@tamagui/lucide-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, useColorScheme } from 'react-native';
import {
    Button,
    Card,
    H2,
    H3,
    Separator,
    Spinner,
    Text,
    XStack,
    YStack,
} from 'tamagui';

import { MacroCircleGroup, MacroRow } from '../../src/components';
import { getFoodById } from '../../src/services/api/fatsecret';
import { useDiaryStore } from '../../src/stores/diary.store';
import { useFoodSearchStore } from '../../src/stores/food-search.store';
import { MEAL_TYPES, MealType, NormalizedFood, NormalizedServing } from '../../src/types';
import { getTodayKey } from '../../src/utils/date';
import { scaleNutrition } from '../../src/utils/nutrition';

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    getCachedFood,
    setCachedFood,
    addRecentFood,
    addFavorite,
    removeFavorite,
    isFavorite,
  } = useFoodSearchStore();
  const { addEntry, selectedDate } = useDiaryStore();

  const [food, setFood] = useState<NormalizedFood | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedServing, setSelectedServing] = useState<NormalizedServing | null>(null);
  const [servingAmount, setServingAmount] = useState(1);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');

  const favorite = food ? isFavorite(food.id) : false;

  useEffect(() => {
    if (id) {
      loadFood(id);
    }
  }, [id]);

  const loadFood = async (foodId: string) => {
    setIsLoading(true);
    setError(null);

    // Check cache first
    const cached = getCachedFood(foodId);
    if (cached) {
      setFood(cached);
      setSelectedServing(cached.servings[0] || null);
      setIsLoading(false);
      return;
    }

    try {
      const result = await getFoodById(foodId);
      if (result) {
        setFood(result);
        setSelectedServing(result.servings[0] || null);
        setCachedFood(foodId, result);
        
        // Add to recent foods
        addRecentFood({
          food_id: result.id,
          food_name: result.name,
          food_description: '',
          food_type: result.brand ? 'Brand' : 'Generic',
          brand_name: result.brand,
        });
      } else {
        setError('Food not found');
      }
    } catch (err) {
      setError('Failed to load food details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = () => {
    if (!food) return;
    
    if (favorite) {
      removeFavorite(food.id);
    } else {
      addFavorite({
        food_id: food.id,
        food_name: food.name,
        food_description: '',
        food_type: food.brand ? 'Brand' : 'Generic',
        brand_name: food.brand,
      });
    }
  };

  const handleAddToDiary = () => {
    if (!food || !selectedServing) return;

    const scaledNutrition = scaleNutrition(selectedServing.nutrition, servingAmount);

    addEntry({
      date: selectedDate || getTodayKey(),
      mealType: selectedMeal,
      foodId: food.id,
      foodName: food.name,
      brandName: food.brand,
      servingId: selectedServing.id,
      servingAmount,
      servingUnit: selectedServing.unit,
      servingDescription: selectedServing.description,
      nutrition: scaledNutrition,
      source: food.source,
    });

    Alert.alert(
      'Added',
      `${food.name} added to ${MEAL_TYPES.find((m) => m.type === selectedMeal)?.label}`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const incrementAmount = () => setServingAmount((prev) => Math.min(prev + 0.5, 10));
  const decrementAmount = () => setServingAmount((prev) => Math.max(prev - 0.5, 0.5));

  const scaledNutrition = selectedServing
    ? scaleNutrition(selectedServing.nutrition, servingAmount)
    : null;

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="#10B981" />
        <Text marginTop="$2" color="$colorHover">Loading food details...</Text>
      </YStack>
    );
  }

  if (error || !food) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" backgroundColor="$background">
        <Text color={isDark ? '#FCA5A5' : '#DC2626'} textAlign="center">{error || 'Food not found'}</Text>
        <Button marginTop="$4" onPress={() => router.back()}>
          Go Back
        </Button>
      </YStack>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
    >
      {/* Food Header */}
      <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1}>
            <H2 color="$color">{food.name}</H2>
            {food.brand && (
              <Text fontSize="$4" color="$colorHover" marginTop="$1">
                {food.brand}
              </Text>
            )}
          </YStack>
          <Button
            size="$3"
            chromeless
            icon={favorite ? Star : StarOff}
            onPress={handleToggleFavorite}
            color={favorite ? '#F59E0B' : '$colorHover'}
          />
        </XStack>
      </Card>

      {/* Serving Selection */}
      <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
        <H3 marginBottom="$3" color="$color">Serving Size</H3>

        {/* Serving Type Selector - Button-based for React Native compatibility */}
        {food.servings && food.servings.length > 0 ? (
          <XStack flexWrap="wrap" gap="$2">
            {food.servings.map((serving) => (
              <Button
                key={serving.id}
                size="$3"
                backgroundColor={selectedServing?.id === serving.id ? '#10B981' : '$background'}
                color={selectedServing?.id === serving.id ? 'white' : '$color'}
                borderWidth={1}
                borderColor={selectedServing?.id === serving.id ? '#10B981' : '$borderColor'}
                onPress={() => setSelectedServing(serving)}
                flexShrink={1}
              >
                <Text 
                  fontSize="$3" 
                  color={selectedServing?.id === serving.id ? 'white' : '$color'}
                  numberOfLines={1}
                >
                  {serving.description}
                </Text>
              </Button>
            ))}
          </XStack>
        ) : (
          <Text color="$colorHover">No serving sizes available</Text>
        )}

        {/* Amount Selector */}
        <XStack alignItems="center" justifyContent="center" gap="$4" marginTop="$4">
          <Button
            size="$4"
            circular
            icon={Minus}
            onPress={decrementAmount}
            disabled={servingAmount <= 0.5}
            backgroundColor="$backgroundHover"
          />
          <YStack alignItems="center" minWidth={80}>
            <Text fontSize="$8" fontWeight="700" color="$color">
              {servingAmount}
            </Text>
            <Text fontSize="$2" color="$colorHover">servings</Text>
          </YStack>
          <Button
            size="$4"
            circular
            icon={Plus}
            onPress={incrementAmount}
            disabled={servingAmount >= 10}
            backgroundColor="$backgroundHover"
          />
        </XStack>
      </Card>

      {/* Nutrition Info */}
      {scaledNutrition && (
        <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
          <H3 marginBottom="$3" color="$color">Nutrition</H3>

          {/* Main Macros */}
          <YStack marginBottom="$4">
            <MacroCircleGroup
              calories={scaledNutrition.calories}
              protein={scaledNutrition.protein}
              carbs={scaledNutrition.carbs}
              fat={scaledNutrition.fat}
            />
          </YStack>

          <Separator marginVertical="$3" />

          {/* Additional Nutrients */}
          <YStack gap="$2">
            {scaledNutrition.fiber !== undefined && (
              <MacroRow label="Fiber" value={scaledNutrition.fiber} unit="g" />
            )}
            {scaledNutrition.sugar !== undefined && (
              <MacroRow label="Sugar" value={scaledNutrition.sugar} unit="g" />
            )}
            {scaledNutrition.sodium !== undefined && (
              <MacroRow label="Sodium" value={scaledNutrition.sodium} unit="mg" />
            )}
            {scaledNutrition.saturatedFat !== undefined && (
              <MacroRow label="Saturated Fat" value={scaledNutrition.saturatedFat} unit="g" />
            )}
            {scaledNutrition.cholesterol !== undefined && (
              <MacroRow label="Cholesterol" value={scaledNutrition.cholesterol} unit="mg" />
            )}
          </YStack>
        </Card>
      )}

      {/* Meal Selection */}
      <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
        <H3 marginBottom="$3" color="$color">Add to Meal</H3>
        <XStack flexWrap="wrap" gap="$2">
          {MEAL_TYPES.map((meal) => (
            <Button
              key={meal.type}
              size="$3"
              backgroundColor={selectedMeal === meal.type ? '#10B981' : '$background'}
              color={selectedMeal === meal.type ? 'white' : '$color'}
              borderWidth={1}
              borderColor={selectedMeal === meal.type ? '#10B981' : '$borderColor'}
              onPress={() => setSelectedMeal(meal.type)}
            >
              {meal.label}
            </Button>
          ))}
        </XStack>
      </Card>

      {/* Add Button */}
      <Button
        size="$5"
        backgroundColor="#10B981"
        color="white"
        onPress={handleAddToDiary}
      >
        Add to Diary
      </Button>
    </ScrollView>
  );
}

