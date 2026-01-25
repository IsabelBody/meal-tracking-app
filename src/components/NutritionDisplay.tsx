import { ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
import { memo, useState } from 'react';
import { Button, Progress, Separator, Text, XStack, YStack } from 'tamagui';

import { Nutrition, NUTRIENT_METADATA, NutrientCategory, NutrientMeta } from '../types';
import { formatNutritionValue, calculateDailyValuePercent } from '../utils/nutrition';

/**
 * Category display configuration
 */
const CATEGORY_CONFIG: Record<NutrientCategory, { label: string; color: string }> = {
  macros: { label: 'Macronutrients', color: '#10B981' },
  fats: { label: 'Fats & Fatty Acids', color: '#F59E0B' },
  minerals: { label: 'Minerals', color: '#6366F1' },
  vitamins: { label: 'Vitamins', color: '#EC4899' },
  carotenoids: { label: 'Carotenoids', color: '#F97316' },
  other: { label: 'Other Compounds', color: '#8B5CF6' },
};

/**
 * Order of categories for display
 */
const CATEGORY_ORDER: NutrientCategory[] = ['macros', 'fats', 'minerals', 'vitamins', 'carotenoids', 'other'];

// ============================================================================
// NutrientRow - Single nutrient display with optional daily value progress
// ============================================================================

interface NutrientRowProps {
  label: string;
  value: number;
  unit: string;
  dailyValue?: number;
  showDailyValue?: boolean;
}

const NutrientRow = memo(function NutrientRow({
  label,
  value,
  unit,
  dailyValue,
  showDailyValue = true,
}: NutrientRowProps) {
  const dvPercent = calculateDailyValuePercent(value, dailyValue);
  const displayValue = formatNutritionValue(value, unit);

  return (
    <XStack justifyContent="space-between" alignItems="center" paddingVertical="$2">
      <Text fontSize="$3" color="$colorHover" flex={1}>
        {label}
      </Text>
      <XStack alignItems="center" gap="$2">
        <Text fontSize="$3" fontWeight="500" color="$color" minWidth={70} textAlign="right">
          {displayValue}
        </Text>
        {showDailyValue && dvPercent !== undefined && (
          <Text fontSize="$2" color="$colorHover" minWidth={45} textAlign="right">
            {dvPercent}%
          </Text>
        )}
      </XStack>
    </XStack>
  );
});

// ============================================================================
// NutrientCategory - Collapsible section for a category of nutrients
// ============================================================================

interface NutrientCategorySectionProps {
  category: NutrientCategory;
  nutrients: { meta: NutrientMeta; value: number }[];
  showDailyValues?: boolean;
  defaultExpanded?: boolean;
}

const NutrientCategorySection = memo(function NutrientCategorySection({
  category,
  nutrients,
  showDailyValues = true,
  defaultExpanded = false,
}: NutrientCategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const config = CATEGORY_CONFIG[category];

  if (nutrients.length === 0) return null;

  return (
    <YStack marginBottom="$2">
      <Button
        chromeless
        padding="$2"
        onPress={() => setIsExpanded(!isExpanded)}
        backgroundColor="$backgroundHover"
        borderRadius="$2"
      >
        <XStack justifyContent="space-between" alignItems="center" flex={1}>
          <XStack alignItems="center" gap="$2">
            <YStack
              width={4}
              height={20}
              backgroundColor={config.color}
              borderRadius="$1"
            />
            <Text fontSize="$4" fontWeight="600" color="$color">
              {config.label}
            </Text>
            <Text fontSize="$2" color="$colorHover">
              ({nutrients.length})
            </Text>
          </XStack>
          {isExpanded ? (
            <ChevronUp size={20} color="$colorHover" />
          ) : (
            <ChevronDown size={20} color="$colorHover" />
          )}
        </XStack>
      </Button>

      {isExpanded && (
        <YStack paddingHorizontal="$3" paddingTop="$1">
          {nutrients.map(({ meta, value }) => (
            <NutrientRow
              key={meta.key}
              label={meta.label}
              value={value}
              unit={meta.unit}
              dailyValue={meta.dailyValue}
              showDailyValues={showDailyValues}
            />
          ))}
        </YStack>
      )}
    </YStack>
  );
});

// ============================================================================
// NutritionDisplay - Main component showing all nutrition data
// ============================================================================

interface NutritionDisplayProps {
  nutrition: Nutrition;
  showDailyValues?: boolean;
  showEmptyCategories?: boolean;
  expandedCategories?: NutrientCategory[];
  compact?: boolean;
}

export const NutritionDisplay = memo(function NutritionDisplay({
  nutrition,
  showDailyValues = true,
  showEmptyCategories = false,
  expandedCategories = ['macros', 'fats'],
  compact = false,
}: NutritionDisplayProps) {
  // Group nutrients by category, filtering out undefined/zero values
  const categorizedNutrients = CATEGORY_ORDER.reduce((acc, category) => {
    const categoryNutrients = NUTRIENT_METADATA
      .filter((meta) => meta.category === category)
      .map((meta) => ({
        meta,
        value: nutrition[meta.key] as number | undefined,
      }))
      .filter(({ value }) => value !== undefined && value !== null && (value !== 0 || showEmptyCategories));

    if (categoryNutrients.length > 0 || showEmptyCategories) {
      acc[category] = categoryNutrients as { meta: NutrientMeta; value: number }[];
    }
    return acc;
  }, {} as Record<NutrientCategory, { meta: NutrientMeta; value: number }[]>);

  // Calculate total available nutrients for summary
  const totalNutrients = Object.values(categorizedNutrients).reduce((sum, arr) => sum + arr.length, 0);

  if (compact) {
    // Compact mode: show key nutrients inline
    return (
      <YStack gap="$2">
        <XStack flexWrap="wrap" gap="$3">
          {NUTRIENT_METADATA.slice(0, 10).map((meta) => {
            const value = nutrition[meta.key];
            if (value === undefined || value === null) return null;
            return (
              <YStack key={meta.key} alignItems="center" minWidth={60}>
                <Text fontSize="$3" fontWeight="600" color="$color">
                  {formatNutritionValue(value as number, meta.unit)}
                </Text>
                <Text fontSize="$1" color="$colorHover">
                  {meta.label}
                </Text>
              </YStack>
            );
          })}
        </XStack>
      </YStack>
    );
  }

  return (
    <YStack>
      {/* Summary */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <Text fontSize="$2" color="$colorHover">
          {totalNutrients} nutrients available
        </Text>
        {showDailyValues && (
          <Text fontSize="$2" color="$colorHover">
            % Daily Value
          </Text>
        )}
      </XStack>

      {/* Categories */}
      {CATEGORY_ORDER.map((category) => {
        const nutrients = categorizedNutrients[category];
        if (!nutrients || nutrients.length === 0) return null;

        return (
          <NutrientCategorySection
            key={category}
            category={category}
            nutrients={nutrients}
            showDailyValues={showDailyValues}
            defaultExpanded={expandedCategories.includes(category)}
          />
        );
      })}
    </YStack>
  );
});

// ============================================================================
// MicronutrientHighlights - Show key micronutrients with progress bars
// ============================================================================

interface MicronutrientHighlightsProps {
  nutrition: Nutrition;
  maxItems?: number;
}

export const MicronutrientHighlights = memo(function MicronutrientHighlights({
  nutrition,
  maxItems = 6,
}: MicronutrientHighlightsProps) {
  // Get nutrients with daily values that have significant presence (>5% DV)
  const highlights = NUTRIENT_METADATA
    .filter((meta) => {
      if (!meta.dailyValue) return false;
      if (meta.category === 'macros') return false; // Skip macros, show separately
      const value = nutrition[meta.key] as number | undefined;
      if (!value) return false;
      const percent = (value / meta.dailyValue) * 100;
      return percent >= 5;
    })
    .map((meta) => ({
      meta,
      value: nutrition[meta.key] as number,
      percent: Math.round(((nutrition[meta.key] as number) / meta.dailyValue!) * 100),
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, maxItems);

  if (highlights.length === 0) return null;

  return (
    <YStack gap="$2">
      <Text fontSize="$3" fontWeight="600" color="$color" marginBottom="$1">
        Notable Micronutrients
      </Text>
      {highlights.map(({ meta, value, percent }) => (
        <YStack key={meta.key} gap="$1">
          <XStack justifyContent="space-between">
            <Text fontSize="$2" color="$colorHover">
              {meta.label}
            </Text>
            <Text fontSize="$2" color="$color">
              {formatNutritionValue(value, meta.unit)} ({percent}% DV)
            </Text>
          </XStack>
          <Progress
            value={Math.min(percent, 100)}
            backgroundColor="$backgroundHover"
            height={4}
          >
            <Progress.Indicator
              backgroundColor={percent >= 100 ? '#10B981' : percent >= 50 ? '#3B82F6' : '#6B7280'}
            />
          </Progress>
        </YStack>
      ))}
    </YStack>
  );
});

// ============================================================================
// IngredientsDisplay - Show ingredients list
// ============================================================================

interface IngredientsDisplayProps {
  ingredients: string;
}

export const IngredientsDisplay = memo(function IngredientsDisplay({
  ingredients,
}: IngredientsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Clean up the ingredients string
  const cleanedIngredients = ingredients
    .replace(/\s+/g, ' ')
    .trim();
  
  const shouldTruncate = cleanedIngredients.length > 200;
  const displayText = shouldTruncate && !isExpanded
    ? cleanedIngredients.slice(0, 200) + '...'
    : cleanedIngredients;

  return (
    <YStack>
      <Text fontSize="$3" fontWeight="600" color="$color" marginBottom="$2">
        Ingredients
      </Text>
      <Text fontSize="$3" color="$colorHover" lineHeight={20}>
        {displayText}
      </Text>
      {shouldTruncate && (
        <Button
          size="$2"
          chromeless
          onPress={() => setIsExpanded(!isExpanded)}
          marginTop="$1"
        >
          <Text fontSize="$2" color="#3B82F6">
            {isExpanded ? 'Show less' : 'Show more'}
          </Text>
        </Button>
      )}
    </YStack>
  );
});
