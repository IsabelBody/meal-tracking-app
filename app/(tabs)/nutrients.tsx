import * as Clipboard from 'expo-clipboard';
import { useCallback, useMemo } from 'react';
import { Button, Card, H3, Progress, Text, XStack, YStack } from 'tamagui';

import { Copy } from '@tamagui/lucide-icons';

import {
  MicronutrientHighlights,
  NutritionDisplay,
  SwipeableDateHeader,
} from '../../src/components';
import { useToast } from '../../src/contexts/toast';
import { useDateEntries, useDiaryStore } from '../../src/stores/diary.store';
import { useGoalsStore, useNutritionProgress } from '../../src/stores/goals.store';
import { NUTRIENT_METADATA, Nutrition } from '../../src/types/food';
import { getMacroPercentages, sumNutrition } from '../../src/utils/nutrition';

/**
 * Format nutrition data as readable text for clipboard
 */
function formatNutritionForClipboard(
  totals: Nutrition,
  goals: { calories: number; protein: number; carbs: number; fat: number },
  date: string,
  entryCount: number
): string {
  const lines: string[] = [];
  
  lines.push(`Nutrition Summary for ${date}`);
  lines.push(`(${entryCount} ${entryCount === 1 ? 'entry' : 'entries'})`);
  lines.push('');
  
  // Macronutrients with goals
  lines.push('=== MACRONUTRIENTS ===');
  lines.push(`Calories: ${Math.round(totals.calories)} / ${goals.calories} kcal`);
  lines.push(`Protein: ${Math.round(totals.protein)}g / ${goals.protein}g`);
  lines.push(`Carbs: ${Math.round(totals.carbs)}g / ${goals.carbs}g`);
  lines.push(`Fat: ${Math.round(totals.fat)}g / ${goals.fat}g`);
  
  if (totals.fiber !== undefined && totals.fiber > 0) {
    lines.push(`Fiber: ${totals.fiber.toFixed(1)}g`);
  }
  if (totals.sugar !== undefined && totals.sugar > 0) {
    lines.push(`Sugar: ${totals.sugar.toFixed(1)}g`);
  }
  
  // Fats breakdown
  const fats = NUTRIENT_METADATA.filter(n => n.category === 'fats');
  const fatValues = fats.filter(n => {
    const val = totals[n.key];
    return val !== undefined && val !== null && val !== 0;
  });
  if (fatValues.length > 0) {
    lines.push('');
    lines.push('=== FATS ===');
    fatValues.forEach(n => {
      const val = totals[n.key];
      if (val !== undefined) {
        lines.push(`${n.label}: ${val.toFixed(1)}${n.unit}`);
      }
    });
  }
  
  // Minerals
  const minerals = NUTRIENT_METADATA.filter(n => n.category === 'minerals');
  const mineralValues = minerals.filter(n => {
    const val = totals[n.key];
    return val !== undefined && val !== null && val !== 0;
  });
  if (mineralValues.length > 0) {
    lines.push('');
    lines.push('=== MINERALS ===');
    mineralValues.forEach(n => {
      const val = totals[n.key];
      if (val !== undefined) {
        const dv = n.dailyValue ? ` (${Math.round((val / n.dailyValue) * 100)}% DV)` : '';
        lines.push(`${n.label}: ${val.toFixed(1)}${n.unit}${dv}`);
      }
    });
  }
  
  // Vitamins
  const vitamins = NUTRIENT_METADATA.filter(n => n.category === 'vitamins');
  const vitaminValues = vitamins.filter(n => {
    const val = totals[n.key];
    return val !== undefined && val !== null && val !== 0;
  });
  if (vitaminValues.length > 0) {
    lines.push('');
    lines.push('=== VITAMINS ===');
    vitaminValues.forEach(n => {
      const val = totals[n.key];
      if (val !== undefined) {
        const dv = n.dailyValue ? ` (${Math.round((val / n.dailyValue) * 100)}% DV)` : '';
        lines.push(`${n.label}: ${val.toFixed(1)}${n.unit}${dv}`);
      }
    });
  }
  
  return lines.join('\n');
}

export default function NutrientsScreen() {
  const selectedDate = useDiaryStore((state) => state.selectedDate);
  const setSelectedDate = useDiaryStore((state) => state.setSelectedDate);
  const entries = useDateEntries(selectedDate);
  const goals = useGoalsStore((state) => state.goals);
  const { showSuccess, showError } = useToast();

  // Calculate totals
  const totals = useMemo(() => sumNutrition(entries), [entries]);
  const progress = useNutritionProgress(totals);
  const macroPercentages = useMemo(() => getMacroPercentages(totals), [totals]);

  // Check if we have any data for the day
  const hasEntries = entries.length > 0;

  const handleCopyNutrition = useCallback(async () => {
    if (!hasEntries) return;
    
    try {
      const text = formatNutritionForClipboard(totals, goals, selectedDate, entries.length);
      await Clipboard.setStringAsync(text);
      showSuccess('Nutrition data copied to clipboard');
    } catch {
      showError('Failed to copy to clipboard');
    }
  }, [totals, goals, selectedDate, entries.length, hasEntries, showSuccess, showError]);

  return (
    <SwipeableDateHeader
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      rightContent={
        <XStack alignItems="center" gap="$2">
          <Text fontSize="$3" color="$colorHover">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
          {hasEntries && (
            <Button
              size="$2"
              circular
              chromeless
              onPress={handleCopyNutrition}
              icon={<Copy size={18} color="$colorHover" />}
            />
          )}
        </XStack>
      }
    >
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

            {/* Calories */}
            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$colorHover">
                  Calories
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

            {/* Protein */}
            <YStack marginTop="$3" gap="$2">
              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$colorHover">
                  Protein
                </Text>
                <Text fontSize="$3" color="$color">
                  {Math.round(totals.protein)}g / {goals.protein}g
                </Text>
              </XStack>
              <Progress
                value={progress.protein}
                backgroundColor="$backgroundHover"
                height={8}
              >
                <Progress.Indicator
                  backgroundColor={progress.protein > 100 ? '#EF4444' : '#EF4444'}
                />
              </Progress>
            </YStack>

            {/* Carbs */}
            <YStack marginTop="$3" gap="$2">
              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$colorHover">
                  Carbs
                </Text>
                <Text fontSize="$3" color="$color">
                  {Math.round(totals.carbs)}g / {goals.carbs}g
                </Text>
              </XStack>
              <Progress
                value={progress.carbs}
                backgroundColor="$backgroundHover"
                height={8}
              >
                <Progress.Indicator
                  backgroundColor={progress.carbs > 100 ? '#EF4444' : '#3B82F6'}
                />
              </Progress>
            </YStack>

            {/* Fat */}
            <YStack marginTop="$3" gap="$2">
              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$colorHover">
                  Fat
                </Text>
                <Text fontSize="$3" color="$color">
                  {Math.round(totals.fat)}g / {goals.fat}g
                </Text>
              </XStack>
              <Progress
                value={progress.fat}
                backgroundColor="$backgroundHover"
                height={8}
              >
                <Progress.Indicator
                  backgroundColor={progress.fat > 100 ? '#EF4444' : '#F59E0B'}
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
              expandedCategories={['macros', 'fats', 'minerals', 'vitamins', 'carotenoids', 'other']}
            />
          </Card>
        </YStack>
      )}
    </SwipeableDateHeader>
  );
}
