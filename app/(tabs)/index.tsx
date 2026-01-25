import { memo, useMemo, useCallback, useEffect } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Card,
  H2,
  H3,
  Paragraph,
  Button,
  Progress,
  Separator,
} from 'tamagui';
import { Plus, ChevronRight, Cloud, CloudOff } from '@tamagui/lucide-icons';

import { useDiaryStore, useTodayEntries, useTodayTotals } from '../../src/stores/diary.store';
import { useGoalsStore, useNutritionProgress } from '../../src/stores/goals.store';
import { useAuthStore } from '../../src/stores/auth.store';
import { useSync } from '../../src/hooks/useSync';
import { MEAL_TYPES, MealType } from '../../src/types';
import { getRelativeDateLabel, getTodayKey } from '../../src/utils/date';
import { sumNutrition } from '../../src/utils/nutrition';

export default function DashboardScreen() {
  const router = useRouter();
  const selectedDate = useDiaryStore((state) => state.selectedDate);
  const entries = useDiaryStore((state) => state.entries[selectedDate] || []);
  const goals = useGoalsStore((state) => state.goals);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Initialize sync
  const { isSyncing, syncCurrentDate } = useSync();
  
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
  const handleRefresh = useCallback(() => {
    if (isAuthenticated) {
      syncCurrentDate();
    }
  }, [isAuthenticated, syncCurrentDate]);

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
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
      contentContainerStyle={{ padding: 16 }}
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
          <XStack alignItems="center" gap="$1" opacity={0.6}>
            <Cloud size={16} color="#10B981" />
            <Text fontSize="$1" color="#10B981">Synced</Text>
          </XStack>
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
        <XStack justifyContent="space-between">
          <MacroItem
            label="Protein"
            current={totals.protein}
            goal={goals.protein}
            color="#EF4444"
            progress={progress.protein}
          />
          <MacroItem
            label="Carbs"
            current={totals.carbs}
            goal={goals.carbs}
            color="#3B82F6"
            progress={progress.carbs}
          />
          <MacroItem
            label="Fat"
            current={totals.fat}
            goal={goals.fat}
            color="#F59E0B"
            progress={progress.fat}
          />
        </XStack>
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

const MacroItem = memo(function MacroItem({
  label,
  current,
  goal,
  color,
  progress,
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
  progress: number;
}) {
  return (
    <YStack alignItems="center" flex={1} gap="$2">
      <Text fontSize="$2" color="$colorHover">
        {label}
      </Text>
      <Progress
        value={progress}
        backgroundColor="$backgroundHover"
        height={6}
        width={60}
      >
        <Progress.Indicator backgroundColor={color} />
      </Progress>
      <Text fontSize="$3" fontWeight="600" color="$color">
        {Math.round(current)}g
      </Text>
      <Text fontSize="$1" color="$colorHover">
        / {goal}g
      </Text>
    </YStack>
  );
});

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
