import { Plus, Trash2, X } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, useColorScheme } from 'react-native';
import {
    Button,
    Card,
    H2,
    H3,
    Input,
    Text,
    XStack,
    YStack,
} from 'tamagui';

import { MacroCompact } from '../../src/components';
import { useDraftMeal, useIsEditingMeal, useMealStore } from '../../src/stores/meal.store';

export default function CreateMealScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const draftMeal = useDraftMeal();
  const isEditing = useIsEditingMeal();
  const { removeItemFromDraft, saveDraftMeal, cancelDraft } = useMealStore();
  const [mealName, setMealName] = useState(draftMeal?.name || '');

  const handleAddMore = useCallback(() => {
    router.push('/(tabs)/search');
  }, [router]);

  const handleRemoveItem = useCallback((itemId: string) => {
    removeItemFromDraft(itemId);
  }, [removeItemFromDraft]);

  const handleSave = useCallback(() => {
    if (!draftMeal || draftMeal.items.length === 0) {
      Alert.alert('Error', 'Add at least one food item to your meal');
      return;
    }

    const trimmedName = mealName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a name for your meal');
      return;
    }

    const savedMeal = saveDraftMeal(trimmedName);
    if (savedMeal) {
      const message = isEditing
        ? `"${savedMeal.name}" has been updated`
        : `"${savedMeal.name}" has been saved to your meals`;
      Alert.alert(isEditing ? 'Updated' : 'Saved', message, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [draftMeal, mealName, saveDraftMeal, router, isEditing]);

  const handleCancel = useCallback(() => {
    if (draftMeal && draftMeal.items.length > 0) {
      const title = isEditing ? 'Discard Changes?' : 'Discard Meal?';
      const message = isEditing
        ? 'You have unsaved changes. Are you sure you want to discard them?'
        : 'You have unsaved items. Are you sure you want to discard this meal?';
      Alert.alert(
        title,
        message,
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              cancelDraft();
              router.back();
            },
          },
        ]
      );
    } else {
      cancelDraft();
      router.back();
    }
  }, [draftMeal, cancelDraft, router, isEditing]);

  // Calculate totals
  const totalCalories = draftMeal?.items.reduce(
    (sum, item) => sum + item.nutrition.calories,
    0
  ) || 0;
  const totalProtein = draftMeal?.items.reduce(
    (sum, item) => sum + item.nutrition.protein,
    0
  ) || 0;
  const totalCarbs = draftMeal?.items.reduce(
    (sum, item) => sum + item.nutrition.carbs,
    0
  ) || 0;
  const totalFat = draftMeal?.items.reduce(
    (sum, item) => sum + item.nutrition.fat,
    0
  ) || 0;

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
          icon={X}
          onPress={handleCancel}
        />
        <H2 color="$color">{isEditing ? 'Edit Meal' : 'Create Meal'}</H2>
        <Button
          size="$3"
          backgroundColor="#10B981"
          color="white"
          onPress={handleSave}
          disabled={!draftMeal || draftMeal.items.length === 0 || !mealName.trim()}
          opacity={!draftMeal || draftMeal.items.length === 0 || !mealName.trim() ? 0.5 : 1}
        >
          {isEditing ? 'Update' : 'Save'}
        </Button>
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {/* Meal Name */}
        <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
          <H3 marginBottom="$2" color="$color">Meal Name</H3>
          <Input
            placeholder="e.g., Morning Smoothie"
            value={mealName}
            onChangeText={setMealName}
            backgroundColor="$backgroundHover"
            borderWidth={1}
            borderColor="$borderColor"
            fontSize="$4"
          />
        </Card>

        {/* Totals */}
        {draftMeal && draftMeal.items.length > 0 && (
          <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
            <H3 marginBottom="$2" color="$color">Total Nutrition</H3>
            <MacroCompact
              calories={Math.round(totalCalories)}
              protein={Math.round(totalProtein)}
              carbs={Math.round(totalCarbs)}
              fat={Math.round(totalFat)}
            />
          </Card>
        )}

        {/* Items */}
        <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <H3 color="$color">
              Items {draftMeal && draftMeal.items.length > 0 && `(${draftMeal.items.length})`}
            </H3>
            <Button
              size="$3"
              backgroundColor="$backgroundHover"
              icon={Plus}
              onPress={handleAddMore}
            >
              Add
            </Button>
          </XStack>

          {!draftMeal || draftMeal.items.length === 0 ? (
            <YStack alignItems="center" padding="$4">
              <Text color="$colorHover" textAlign="center">
                No items yet. Search for foods to add to your meal.
              </Text>
              <Button
                size="$4"
                marginTop="$3"
                backgroundColor="#10B981"
                color="white"
                icon={Plus}
                onPress={handleAddMore}
              >
                Add Food
              </Button>
            </YStack>
          ) : (
            <YStack gap="$2">
              {draftMeal.items.map((item) => (
                <XStack
                  key={item.id}
                  padding="$3"
                  backgroundColor="$backgroundHover"
                  borderRadius="$3"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <YStack flex={1} marginRight="$2">
                    <Text fontWeight="500" color="$color" numberOfLines={1}>
                      {item.foodName}
                    </Text>
                    <Text fontSize="$2" color="$colorHover">
                      {item.servingAmount} x {item.servingDescription}
                    </Text>
                    <Text fontSize="$2" color="$colorHover">
                      {Math.round(item.nutrition.calories)} cal
                    </Text>
                  </YStack>
                  <Button
                    size="$2"
                    chromeless
                    icon={Trash2}
                    color="$colorHover"
                    onPress={() => handleRemoveItem(item.id)}
                  />
                </XStack>
              ))}
            </YStack>
          )}
        </Card>
      </ScrollView>
    </YStack>
  );
}
