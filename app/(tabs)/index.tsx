import { AlertCircle, Cloud, CloudOff, Plus, RefreshCw } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Button,
    Card,
    H2,
    H3,
    Progress,
    Separator,
    Text,
    XStack,
    YStack
} from 'tamagui';

import { MacroProgressGroup } from '../../src/components';
import { useToast } from '../../src/contexts/toast';
import { useSync } from '../../src/hooks/useSync';
import { useAuthStore } from '../../src/stores/auth.store';
import { useDateEntries, useDiaryStore } from '../../src/stores/diary.store';
import { useGoalsStore, useNutritionProgress } from '../../src/stores/goals.store';
import { MEAL_TYPES, MealType } from '../../src/types';
import { getRelativeDateLabel } from '../../src/utils/date';
import { sumNutrition } from '../../src/utils/nutrition';

export default function DashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { showError, showSuccess } = useToast();
  const selectedDate = useDiaryStore((state) => state.selectedDate);
  const diaryError = useDiaryStore((state) => state.error);
  const entries = useDateEntries(selectedDate);
  const goals = useGoalsStore((state) => state.goals);
  const goalsError = useGoalsStore((state) => state.error);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Initialize sync
  const { isSyncing, syncCurrentDate, fullSync } = useSync();
  
  // Show toast when sync errors occur
  useEffect(() => {
    if (diaryError) {
      showError(new Error(diaryError), 'Sync Error');
    }
  }, [diaryError, showError]);

  useEffect(() => {
    if (goalsError) {
      showError(new Error(goalsError), 'Goals Sync Error');
    }
  }, [goalsError, showError]);
  
  // Memoize expensive calculations
  const totals = useMemo(() => sumNutrition(entries), [entries]);
  const progress = useNutritionProgress(totals);

  const handleAddFood = useCallback((mealType: MealType) => {
    router.push({
      pathname: '/add-food',
      params: { mealType, date: selectedDate },
    });
  }, [router, selectedDate]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    if (isAuthenticated) {
      await syncCurrentDate();
    }
  }, [isAuthenticated, syncCurrentDate]);

  // Retry sync after error
  const handleRetrySync = useCallback(async () => {
    if (isAuthenticated) {
      await fullSync();
    }
  }, [isAuthenticated, fullSync]);

  // Check if there's a sync error
  const hasSyncError = !!(diaryError || goalsError);

  // Memoize meal groupings to avoid recalculating on every render
  const mealData = useMemo(() => {
    return MEAL_TYPES.map((meal) => {
      const mealEntries = entries.filter((e) => e.mealType === meal.type);
      const mealCalories = mealEntries.reduce((sum, e) => sum + e.nutrition.calories, 0);
      return { ...meal, entries: mealEntries, calories: mealCalories };
    });
  }, [entries]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}
      contentContainerStyle={{ padding: 16, paddingTop: 16 + insets.top }}
      refreshControl={
        <RefreshControl
          refreshing={isSyncing}
          onRefresh={handleRefresh}
          colors={['#10B981']}
          tintColor="#10B981"
        />
      }
    >
      {/* Date Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
        <H2 color="$color">{getRelativeDateLabel(selectedDate)}</H2>
        {/* Sync Status Indicator */}
        {isAuthenticated ? (
          hasSyncError ? (
            <XStack 
              alignItems="center" 
              gap="$1" 
              onPress={handleRetrySync}
              pressStyle={{ opacity: 0.7 }}
            >
              <AlertCircle size={16} color="#EF4444" />
              <Text fontSize="$1" color="#EF4444">Sync Error</Text>
              <RefreshCw size={12} color="#EF4444" />
            </XStack>
          ) : isSyncing ? (
            <XStack alignItems="center" gap="$1" opacity={0.6}>
              <RefreshCw size={16} color="#10B981" />
              <Text fontSize="$1" color="#10B981">Syncing...</Text>
            </XStack>
          ) : (
            <XStack alignItems="center" gap="$1" opacity={0.6}>
              <Cloud size={16} color="#10B981" />
              <Text fontSize="$1" color="#10B981">Synced</Text>
            </XStack>
          )
        ) : (
          <XStack alignItems="center" gap="$1" opacity={0.6}>
            <CloudOff size={16} color="$colorHover" />
            <Text fontSize="$1" color="$colorHover">Local</Text>
          </XStack>
        )}
      </XStack>

      {/* Calorie Summary Card */}
      <Card
        elevate
        bordered
        padding="$4"
        marginBottom="$4"
        backgroundColor="$background"
      >
        <YStack alignItems="center" gap="$3">
          <Text fontSize="$3" color="$colorHover">
            Calories
          </Text>
          <XStack alignItems="baseline" gap="$2">
            <Text fontSize="$9" fontWeight="700" color="$color">
              {Math.round(totals.calories)}
            </Text>
            <Text fontSize="$5" color="$colorHover">
              / {goals.calories}
            </Text>
          </XStack>
          <Progress
            value={progress.calories}
            backgroundColor="$backgroundHover"
            height={8}
            width="100%"
          >
            <Progress.Indicator
              backgroundColor={progress.calories > 100 ? '#EF4444' : '#10B981'}
            />
          </Progress>
          <Text fontSize="$2" color="$colorHover">
            {Math.max(0, goals.calories - totals.calories)} remaining
          </Text>
        </YStack>
      </Card>

      {/* Macro Summary */}
      <Card
        elevate
        bordered
        padding="$4"
        marginBottom="$4"
        backgroundColor="$background"
      >
        <H3 marginBottom="$3" color="$color">Macros</H3>
        <MacroProgressGroup
          current={{
            protein: totals.protein,
            carbs: totals.carbs,
            fat: totals.fat,
          }}
          goals={{
            protein: goals.protein,
            carbs: goals.carbs,
            fat: goals.fat,
          }}
          progress={{
            protein: progress.protein,
            carbs: progress.carbs,
            fat: progress.fat,
          }}
        />
      </Card>

      {/* Meal Sections */}
      {mealData.map((meal) => (
        <MealCard
          key={meal.type}
          meal={meal}
          onAddFood={handleAddFood}
        />
      ))}
    </ScrollView>
  );
}

const MealCard = memo(function MealCard({
  meal,
  onAddFood,
}: {
  meal: { type: MealType; label: string; entries: any[]; calories: number };
  onAddFood: (mealType: MealType) => void;
}) {
  return (
    <Card
      elevate
      bordered
      padding="$3"
      marginBottom="$3"
      backgroundColor="$background"
    >
      <XStack justifyContent="space-between" alignItems="center">
        <YStack>
          <Text fontWeight="600" fontSize="$5" color="$color">
            {meal.label}
          </Text>
          <Text fontSize="$3" color="$colorHover">
            {meal.calories} cal
          </Text>
        </YStack>
        <Button
          size="$3"
          backgroundColor="#10B981"
          color="white"
          icon={Plus}
          onPress={() => onAddFood(meal.type)}
        >
          Add
        </Button>
      </XStack>

      {meal.entries.length > 0 && (
        <YStack marginTop="$3" gap="$2">
          <Separator />
          {meal.entries.map((entry) => (
            <XStack
              key={entry.id}
              justifyContent="space-between"
              alignItems="center"
              paddingVertical="$2"
            >
              <YStack flex={1}>
                <Text fontSize="$3" color="$color" numberOfLines={1}>
                  {entry.foodName}
                </Text>
                <Text fontSize="$2" color="$colorHover">
                  {entry.servingAmount} {entry.servingUnit}
                </Text>
              </YStack>
              <Text fontSize="$3" color="$colorHover">
                {Math.round(entry.nutrition.calories)} cal
              </Text>
            </XStack>
          ))}
        </YStack>
      )}
    </Card>
  );
});
