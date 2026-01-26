import { ChevronLeft, Pencil, Trash2 } from '@tamagui/lucide-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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

import { MacroCircleGroup } from '../../src/components';
import { useAuthStore } from '../../src/stores/auth.store';
import { useDiaryStore } from '../../src/stores/diary.store';
import { useMealStore } from '../../src/stores/meal.store';
import { MEAL_TYPES, MealType } from '../../src/types';
import { getTodayKey } from '../../src/utils/date';

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { getMealById, deleteMeal, startEditingMeal } = useMealStore();
  const { addEntry, selectedDate } = useDiaryStore();
  const { isAuthenticated, getAccessToken } = useAuthStore();

  const meal = id ? getMealById(id) : undefined;
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');

  const handleEdit = useCallback(() => {
    if (!meal) return;

    const success = startEditingMeal(meal.id);
    if (success) {
      router.push('/meal/create');
    } else {
      Alert.alert('Error', 'Could not load meal for editing');
    }
  }, [meal, startEditingMeal, router]);

  const handleAddToDiary = useCallback(async () => {
    if (!meal) return;

    // Get auth token for cloud sync if authenticated
    const token = isAuthenticated ? await getAccessToken() : null;

    // Add as a single combined entry
    await addEntry({
      date: selectedDate || getTodayKey(),
      mealType: selectedMealType,
      foodId: `meal_${meal.id}`,
      foodName: meal.name,
      brandName: undefined,
      servingId: 'meal',
      servingAmount: 1,
      servingUnit: 'meal',
      servingDescription: `${meal.items.length} item${meal.items.length !== 1 ? 's' : ''}`,
      nutrition: meal.totalNutrition,
      source: 'custom',
    }, token || undefined);

    Alert.alert(
      'Added',
      `"${meal.name}" added to ${MEAL_TYPES.find((m) => m.type === selectedMealType)?.label}`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }, [meal, selectedDate, selectedMealType, isAuthenticated, getAccessToken, addEntry, router]);

  const handleDelete = useCallback(() => {
    if (!meal) return;

    Alert.alert(
      'Delete Meal?',
      `Are you sure you want to delete "${meal.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMeal(meal.id);
            router.back();
          },
        },
      ]
    );
  }, [meal, deleteMeal, router]);

  if (!meal) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" backgroundColor="$background">
        <Text color="$colorHover">Meal not found</Text>
        <Button marginTop="$4" onPress={() => router.back()}>
          Go Back
        </Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor={isDark ? '#111827' : '#F9FAFB'}>
      {/* Header */}
      <XStack
        paddingHorizontal="$4"
        paddingTop="$6"
        paddingBottom="$3"
        alignItems="center"
        justifyContent="space-between"
        backgroundColor="$background"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Button
          size="$3"
          chromeless
          icon={ChevronLeft}
          onPress={() => router.back()}
        />
        <H2 color="$color" numberOfLines={1} flex={1} textAlign="center">
          {meal.name}
        </H2>
        <XStack gap="$1">
          <Button
            size="$3"
            chromeless
            icon={Pencil}
            color="$colorHover"
            onPress={handleEdit}
          />
          <Button
            size="$3"
            chromeless
            icon={Trash2}
            color="$colorHover"
            onPress={handleDelete}
          />
        </XStack>
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {/* Nutrition Summary */}
        <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
          <H3 marginBottom="$3" color="$color">Total Nutrition</H3>
          <MacroCircleGroup
            calories={meal.totalNutrition.calories}
            protein={meal.totalNutrition.protein}
            carbs={meal.totalNutrition.carbs}
            fat={meal.totalNutrition.fat}
          />
        </Card>

        {/* Items */}
        <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
          <H3 marginBottom="$3" color="$color">
            Items ({meal.items.length})
          </H3>
          <YStack gap="$2">
            {meal.items.map((item) => (
              <XStack
                key={item.id}
                padding="$3"
                backgroundColor="$backgroundHover"
                borderRadius="$3"
                alignItems="center"
                justifyContent="space-between"
              >
                <YStack flex={1}>
                  <Text fontWeight="500" color="$color" numberOfLines={1}>
                    {item.foodName}
                  </Text>
                  <Text fontSize="$2" color="$colorHover">
                    {item.servingAmount} x {item.servingDescription}
                  </Text>
                </YStack>
                <Text fontSize="$3" color="$colorHover">
                  {Math.round(item.nutrition.calories)} cal
                </Text>
              </XStack>
            ))}
          </YStack>
        </Card>

        {/* Diary Time Slot Selection */}
        <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
          <H3 marginBottom="$3" color="$color">Add to Diary</H3>
          <XStack flexWrap="wrap" gap="$2">
            {MEAL_TYPES.map((mealType) => (
              <Button
                key={mealType.type}
                size="$3"
                backgroundColor={selectedMealType === mealType.type ? '#10B981' : '$background'}
                color={selectedMealType === mealType.type ? 'white' : '$color'}
                borderWidth={1}
                borderColor={selectedMealType === mealType.type ? '#10B981' : '$borderColor'}
                onPress={() => setSelectedMealType(mealType.type)}
              >
                {mealType.label}
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
    </YStack>
  );
}
