import { useMemo } from 'react';
import { ScrollView, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, H2, H3, Progress, Text, XStack, YStack } from 'tamagui';

import {
  MacroCircleGroup,
  MicronutrientHighlights,
  NutritionDisplay,
} from '../../src/components';
import { useDateEntries, useDiaryStore } from '../../src/stores/diary.store';
import { useGoalsStore, useNutritionProgress } from '../../src/stores/goals.store';
import { getRelativeDateLabel } from '../../src/utils/date';
import { sumNutrition, getMacroPercentages } from '../../src/utils/nutrition';

export default function NutrientsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const selectedDate = useDiaryStore((state) => state.selectedDate);
  const entries = useDateEntries(selectedDate);
  const goals = useGoalsStore((state) => state.goals);

  // Calculate totals
  const totals = useMemo(() => sumNutrition(entries), [entries]);
  const progress = useNutritionProgress(totals);
  const macroPercentages = useMemo(() => getMacroPercentages(totals), [totals]);

  // Check if we have any data for the day
  const hasEntries = entries.length > 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}
      contentContainerStyle={{ padding: 16, paddingTop: 16 + insets.top, paddingBottom: 32 }}
    >
      {/* Date Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
        <H2 color="$color">{getRelativeDateLabel(selectedDate)}</H2>
        <Text fontSize="$3" color="$colorHover">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </Text>
      </XStack>

      {!hasEntries ? (
        /* Empty State */
        <Card
          elevate
          bordered
          padding="$6"
          backgroundColor="$background"
          alignItems="center"
        >
          <Text fontSize="$5" color="$colorHover" textAlign="center">
            No food logged yet
          </Text>
          <Text fontSize="$3" color="$colorHover" textAlign="center" marginTop="$2">
            Add foods from the Diary tab to see your nutrient breakdown
          </Text>
        </Card>
      ) : (
        <YStack gap="$4">
          {/* Macros Summary Card */}
          <Card elevate bordered padding="$4" backgroundColor="$background">
            <H3 marginBottom="$3" color="$color">
              Macronutrients
            </H3>
            <MacroCircleGroup
              calories={totals.calories}
              protein={totals.protein}
              carbs={totals.carbs}
              fat={totals.fat}
              size="md"
            />

            {/* Calorie Progress */}
            <YStack marginTop="$4" gap="$2">
              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$colorHover">
                  Daily Calories
                </Text>
                <Text fontSize="$3" color="$color">
                  {Math.round(totals.calories)} / {goals.calories}
                </Text>
              </XStack>
              <Progress
                value={progress.calories}
                backgroundColor="$backgroundHover"
                height={8}
              >
                <Progress.Indicator
                  backgroundColor={progress.calories > 100 ? '#EF4444' : '#10B981'}
                />
              </Progress>
            </YStack>

            {/* Macro Percentage Breakdown */}
            <YStack marginTop="$4" gap="$2">
              <Text fontSize="$2" color="$colorHover">
                Calorie Distribution
              </Text>
              <XStack gap="$3" justifyContent="center">
                <XStack alignItems="center" gap="$1">
                  <YStack width={12} height={12} borderRadius={6} backgroundColor="#EF4444" />
                  <Text fontSize="$2" color="$colorHover">
                    Protein {macroPercentages.protein}%
                  </Text>
                </XStack>
                <XStack alignItems="center" gap="$1">
                  <YStack width={12} height={12} borderRadius={6} backgroundColor="#3B82F6" />
                  <Text fontSize="$2" color="$colorHover">
                    Carbs {macroPercentages.carbs}%
                  </Text>
                </XStack>
                <XStack alignItems="center" gap="$1">
                  <YStack width={12} height={12} borderRadius={6} backgroundColor="#F59E0B" />
                  <Text fontSize="$2" color="$colorHover">
                    Fat {macroPercentages.fat}%
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          </Card>

          {/* Micronutrient Highlights */}
          <Card elevate bordered padding="$4" backgroundColor="$background">
            <MicronutrientHighlights nutrition={totals} maxItems={8} />
            {/* Show message if no highlights */}
            {(() => {
              const hasHighlights = Object.keys(totals).some((key) => {
                if (['calories', 'protein', 'carbs', 'fat'].includes(key)) return false;
                const value = totals[key as keyof typeof totals];
                return value !== undefined && value !== null && value !== 0;
              });
              if (!hasHighlights) {
                return (
                  <YStack alignItems="center" padding="$2">
                    <Text fontSize="$3" color="$colorHover" textAlign="center">
                      No micronutrient data available
                    </Text>
                    <Text fontSize="$2" color="$colorHover" textAlign="center" marginTop="$1">
                      Try searching for foods with detailed nutrition info
                    </Text>
                  </YStack>
                );
              }
              return null;
            })()}
          </Card>

          {/* Full Nutrition Breakdown */}
          <Card elevate bordered padding="$4" backgroundColor="$background">
            <H3 marginBottom="$3" color="$color">
              Full Nutrient Breakdown
            </H3>
            <NutritionDisplay
              nutrition={totals}
              showDailyValues={true}
              showEmptyCategories={false}
              expandedCategories={['macros']}
            />
          </Card>
        </YStack>
      )}
    </ScrollView>
  );
}
