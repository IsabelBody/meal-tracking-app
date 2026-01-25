import { useState, useEffect } from 'react';
import { ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Card,
  H2,
  H3,
  Button,
  Spinner,
  Select,
  Input,
  Adapt,
  Sheet,
  Separator,
} from 'tamagui';
import { Check, ChevronDown, Star, StarOff, Plus, Minus } from '@tamagui/lucide-icons';

import { getFoodById } from '../../src/services/api/fatsecret';
import { useFoodSearchStore } from '../../src/stores/food-search.store';
import { useDiaryStore } from '../../src/stores/diary.store';
import { NormalizedFood, NormalizedServing, MealType, MEAL_TYPES } from '../../src/types';
import { scaleNutrition } from '../../src/utils/nutrition';
import { getTodayKey } from '../../src/utils/date';

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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
        <Text color="#DC2626" textAlign="center">{error || 'Food not found'}</Text>
        <Button marginTop="$4" onPress={() => router.back()}>
          Go Back
        </Button>
      </YStack>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
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

        {/* Serving Type Selector */}
        <Select
          value={selectedServing?.id || ''}
          onValueChange={(value) => {
            const serving = food.servings.find((s) => s.id === value);
            if (serving) setSelectedServing(serving);
          }}
        >
          <Select.Trigger width="100%" iconAfter={ChevronDown}>
            <Select.Value placeholder="Select serving" />
          </Select.Trigger>

          <Adapt when="sm" platform="touch">
            <Sheet modal dismissOnSnapToBottom snapPointsMode="fit">
              <Sheet.Frame>
                <Sheet.ScrollView>
                  <Adapt.Contents />
                </Sheet.ScrollView>
              </Sheet.Frame>
              <Sheet.Overlay />
            </Sheet>
          </Adapt>

          <Select.Content>
            <Select.Viewport>
              {food.servings.map((serving, index) => (
                <Select.Item key={serving.id} index={index} value={serving.id}>
                  <Select.ItemText>{serving.description}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={16} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select>

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
          <XStack justifyContent="space-around" marginBottom="$4">
            <NutritionCircle
              label="Calories"
              value={Math.round(scaledNutrition.calories)}
              unit=""
              color="#10B981"
            />
            <NutritionCircle
              label="Protein"
              value={Math.round(scaledNutrition.protein * 10) / 10}
              unit="g"
              color="#EF4444"
            />
            <NutritionCircle
              label="Carbs"
              value={Math.round(scaledNutrition.carbs * 10) / 10}
              unit="g"
              color="#3B82F6"
            />
            <NutritionCircle
              label="Fat"
              value={Math.round(scaledNutrition.fat * 10) / 10}
              unit="g"
              color="#F59E0B"
            />
          </XStack>

          <Separator marginVertical="$3" />

          {/* Additional Nutrients */}
          <YStack gap="$2">
            {scaledNutrition.fiber !== undefined && (
              <NutritionRow label="Fiber" value={scaledNutrition.fiber} unit="g" />
            )}
            {scaledNutrition.sugar !== undefined && (
              <NutritionRow label="Sugar" value={scaledNutrition.sugar} unit="g" />
            )}
            {scaledNutrition.sodium !== undefined && (
              <NutritionRow label="Sodium" value={scaledNutrition.sodium} unit="mg" />
            )}
            {scaledNutrition.saturatedFat !== undefined && (
              <NutritionRow label="Saturated Fat" value={scaledNutrition.saturatedFat} unit="g" />
            )}
            {scaledNutrition.cholesterol !== undefined && (
              <NutritionRow label="Cholesterol" value={scaledNutrition.cholesterol} unit="mg" />
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

function NutritionCircle({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <YStack alignItems="center">
      <YStack
        width={70}
        height={70}
        borderRadius={35}
        backgroundColor={`${color}15`}
        borderWidth={3}
        borderColor={color}
        justifyContent="center"
        alignItems="center"
      >
        <Text fontSize="$4" fontWeight="700" color={color}>
          {value}
        </Text>
        {unit && (
          <Text fontSize="$1" color={color}>
            {unit}
          </Text>
        )}
      </YStack>
      <Text fontSize="$2" color="$colorHover" marginTop="$1">
        {label}
      </Text>
    </YStack>
  );
}

function NutritionRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <XStack justifyContent="space-between" paddingVertical="$1">
      <Text color="$colorHover">{label}</Text>
      <Text fontWeight="500" color="$color">
        {Math.round(value * 10) / 10}{unit}
      </Text>
    </XStack>
  );
}
