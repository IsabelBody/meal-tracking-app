import { ChevronLeft, Pencil, Separator, Trash2, X } from '@tamagui/lucide-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, TouchableWithoutFeedback, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { getTodayKey } from '../../src/utils/date';

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const { getMealById, deleteMeal, startEditingMeal } = useMealStore();
  const { addEntry, selectedDate } = useDiaryStore();
  const { isAuthenticated, getAccessToken } = useAuthStore();

  const meal = id ? getMealById(id) : undefined;
  const [showMenu, setShowMenu] = useState(false);

  const handleEdit = useCallback(() => {
    if (!meal) return;
    setShowMenu(false);

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
      mealType: 'snack', // Default value for backwards compatibility
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
      `"${meal.name}" added to diary`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }, [meal, selectedDate, isAuthenticated, getAccessToken, addEntry, router]);

  const handleDelete = useCallback(() => {
    if (!meal) return;
    setShowMenu(false);

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
        <Button
          size="$3"
          chromeless
          icon={Pencil}
          color="$colorHover"
          onPress={() => setShowMenu(true)}
        />
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

      {/* Edit/Delete Menu Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showMenu}
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingBottom: insets.bottom + 16,
                  paddingTop: 8,
                }}
              >
                {/* Handle bar */}
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
                      borderRadius: 2,
                    }}
                  />
                </View>

                {/* Header */}
                <XStack paddingHorizontal="$4" paddingVertical="$3" justifyContent="space-between" alignItems="center">
                  <Text fontSize={18} fontWeight="600" color={isDark ? '#F9FAFB' : '#111827'}>
                    Meal Options
                  </Text>
                  <Pressable onPress={() => setShowMenu(false)}>
                    <X size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  </Pressable>
                </XStack>

                <Separator backgroundColor={isDark ? '#374151' : '#E5E7EB'} />

                <YStack paddingHorizontal="$4" paddingTop="$2">
                  <Pressable onPress={handleEdit}>
                    <XStack paddingVertical="$4" alignItems="center" gap="$3">
                      <YStack
                        width={44}
                        height={44}
                        borderRadius={22}
                        backgroundColor={isDark ? '#374151' : '#F3F4F6'}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Pencil size={22} color="#3B82F6" />
                      </YStack>
                      <YStack flex={1}>
                        <Text color={isDark ? '#F9FAFB' : '#111827'} fontWeight="600" fontSize={16}>
                          Edit Meal
                        </Text>
                        <Text color={isDark ? '#9CA3AF' : '#6B7280'} fontSize={13}>
                          Modify meal details and items
                        </Text>
                      </YStack>
                    </XStack>
                  </Pressable>

                  <Separator backgroundColor={isDark ? '#374151' : '#E5E7EB'} />

                  <Pressable onPress={handleDelete}>
                    <XStack paddingVertical="$4" alignItems="center" gap="$3">
                      <YStack
                        width={44}
                        height={44}
                        borderRadius={22}
                        backgroundColor={isDark ? '#374151' : '#F3F4F6'}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Trash2 size={22} color="#EF4444" />
                      </YStack>
                      <YStack flex={1}>
                        <Text color={isDark ? '#F9FAFB' : '#111827'} fontWeight="600" fontSize={16}>
                          Delete Meal
                        </Text>
                        <Text color={isDark ? '#9CA3AF' : '#6B7280'} fontSize={13}>
                          Permanently remove this meal
                        </Text>
                      </YStack>
                    </XStack>
                  </Pressable>
                </YStack>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </YStack>
  );
}
