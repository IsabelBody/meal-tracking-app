import { Minus, Plus } from '@tamagui/lucide-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, useColorScheme } from 'react-native';
import {
    Button,
    Card,
    H2,
    H3,
    Text,
    XStack,
    YStack,
} from 'tamagui';

import { MacroItemGroup } from '../src/components';
import { useAuthStore } from '../src/stores/auth.store';
import { useDiaryStore } from '../src/stores/diary.store';
import { MEAL_TYPES, MealType, NormalizedFood, NormalizedServing } from '../src/types';
import { getTodayKey } from '../src/utils/date';
import { scaleNutrition } from '../src/utils/nutrition';

export default function AddFoodScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams<{
    mealType?: string;
    date?: string;
    foodData?: string;
    source?: string;
  }>();

  const { addEntry } = useDiaryStore();
  const { isAuthenticated, getAccessToken } = useAuthStore();

  const [food, setFood] = useState<NormalizedFood | null>(null);
  const [selectedServing, setSelectedServing] = useState<NormalizedServing | null>(null);
  const [servingAmount, setServingAmount] = useState(1);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    (params.mealType as MealType) || 'breakfast'
  );
  const [selectedDate] = useState(params.date || getTodayKey());

  useEffect(() => {
    if (params.foodData) {
      try {
        const parsedFood = JSON.parse(params.foodData) as NormalizedFood;
        setFood(parsedFood);
        setSelectedServing(parsedFood.servings[0] || null);
      } catch (e) {
        console.error('Failed to parse food data:', e);
      }
    }
  }, [params.foodData]);

  const handleAddToDiary = useCallback(async () => {
    if (!food || !selectedServing) {
      Alert.alert('Error', 'Please select a food and serving size');
      return;
    }

    const scaledNutrition = scaleNutrition(selectedServing.nutrition, servingAmount);

    // Get auth token for cloud sync if authenticated
    const token = isAuthenticated ? await getAccessToken() : null;

    await addEntry({
      date: selectedDate,
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
    }, token || undefined);

    Alert.alert(
      'Added',
      `${food.name} added to ${MEAL_TYPES.find((m) => m.type === selectedMeal)?.label}`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }, [food, selectedServing, servingAmount, selectedDate, selectedMeal, isAuthenticated, getAccessToken, addEntry, router]);

  const incrementAmount = () => setServingAmount((prev) => Math.min(prev + 0.5, 10));
  const decrementAmount = () => setServingAmount((prev) => Math.max(prev - 0.5, 0.5));

  const scaledNutrition = selectedServing
    ? scaleNutrition(selectedServing.nutrition, servingAmount)
    : null;

  // If no food data provided, show search prompt
  if (!food) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" backgroundColor="$background">
        <Text fontSize="$5" textAlign="center" color="$color" marginBottom="$4">
          Search for a food or scan a barcode to add it to your diary.
        </Text>
        <Button
          size="$4"
          backgroundColor="#10B981"
          color="white"
          onPress={() => router.push('/(tabs)/search')}
        >
          Search Foods
        </Button>
        <Button
          size="$4"
          marginTop="$3"
          backgroundColor="$background"
          borderWidth={1}
          borderColor="$borderColor"
          onPress={() => router.push('/(tabs)/scanner')}
        >
          Scan Barcode
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
        <H2 color="$color">{food.name}</H2>
        {food.brand && (
          <Text fontSize="$4" color="$colorHover" marginTop="$1">
            {food.brand}
          </Text>
        )}
        {params.source === 'barcode' && (
          <Text fontSize="$2" color="#10B981" marginTop="$2">
            Scanned from barcode
          </Text>
        )}
      </Card>

      {/* Diary Time Slot Selection */}
      <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
        <H3 marginBottom="$3" color="$color">Add to Diary</H3>
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

      {/* Serving Selection */}
      <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
        <H3 marginBottom="$3" color="$color">Serving Size</H3>

        {/* Serving Type Selector - Only render Select if there are servings */}
        {food.servings && food.servings.length > 0 ? (
          <YStack>
            {/* Use Button-based selector for better React Native compatibility */}
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
          </YStack>
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

      {/* Nutrition Preview */}
      {scaledNutrition && (
        <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
          <H3 marginBottom="$3" color="$color">Nutrition</H3>
          <MacroItemGroup
            calories={scaledNutrition.calories}
            protein={scaledNutrition.protein}
            carbs={scaledNutrition.carbs}
            fat={scaledNutrition.fat}
          />
        </Card>
      )}

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

