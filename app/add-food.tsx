import { useState, useEffect, useCallback } from 'react';
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
  Select,
  Adapt,
  Sheet,
  Separator,
} from 'tamagui';
import { Check, ChevronDown, Plus, Minus } from '@tamagui/lucide-icons';

import { useDiaryStore } from '../src/stores/diary.store';
import { useAuthStore } from '../src/stores/auth.store';
import { NormalizedFood, NormalizedServing, MealType, MEAL_TYPES } from '../src/types';
import { scaleNutrition } from '../src/utils/nutrition';
import { getTodayKey } from '../src/utils/date';

export default function AddFoodScreen() {
  const router = useRouter();
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
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
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

      {/* Nutrition Preview */}
      {scaledNutrition && (
        <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
          <H3 marginBottom="$3" color="$color">Nutrition</H3>
          <XStack justifyContent="space-around">
            <NutritionItem
              label="Calories"
              value={Math.round(scaledNutrition.calories)}
              color="#10B981"
            />
            <NutritionItem
              label="Protein"
              value={`${Math.round(scaledNutrition.protein * 10) / 10}g`}
              color="#EF4444"
            />
            <NutritionItem
              label="Carbs"
              value={`${Math.round(scaledNutrition.carbs * 10) / 10}g`}
              color="#3B82F6"
            />
            <NutritionItem
              label="Fat"
              value={`${Math.round(scaledNutrition.fat * 10) / 10}g`}
              color="#F59E0B"
            />
          </XStack>
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

function NutritionItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <YStack alignItems="center">
      <Text fontSize="$5" fontWeight="700" color={color}>
        {value}
      </Text>
      <Text fontSize="$2" color="$colorHover">
        {label}
      </Text>
    </YStack>
  );
}
