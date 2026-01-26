import { ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
import { memo, useState } from 'react';
import { Button, Progress, Text, XStack, YStack } from 'tamagui';

import { useEnabledAvoidTerms } from '../stores/avoid-foods.store';
import { NUTRIENT_METADATA, NutrientCategory, NutrientMeta, Nutrition } from '../types';
import { calculateDailyValuePercent, formatNutritionValue } from '../utils/nutrition';

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
              showDailyValue={showDailyValues}
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
        Micronutrients
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
// IngredientsDisplay - Show ingredients list with avoided ingredients highlighted
// ============================================================================

interface IngredientsDisplayProps {
  ingredients: string;
}

/**
 * Parse ingredients text and return segments with highlighting info
 */
function parseIngredientsWithHighlights(
  text: string,
  avoidTerms: string[]
): { text: string; isAvoided: boolean }[] {
  if (avoidTerms.length === 0) {
    return [{ text, isAvoided: false }];
  }

  // Sort terms by length (longest first) to match longer phrases first
  const sortedTerms = [...avoidTerms].sort((a, b) => b.length - a.length);
  
  // Create a regex pattern that matches any of the avoided terms (case insensitive)
  const escapedTerms = sortedTerms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  const segments: { text: string; isAvoided: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        isAvoided: false,
      });
    }
    // Add the matched (avoided) term
    segments.push({
      text: match[0],
      isAvoided: true,
    });
    lastIndex = pattern.lastIndex;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isAvoided: false,
    });
  }

  return segments.length > 0 ? segments : [{ text, isAvoided: false }];
}

export const IngredientsDisplay = memo(function IngredientsDisplay({
  ingredients,
}: IngredientsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const avoidTerms = useEnabledAvoidTerms();
  
  // Clean up the ingredients string
  const cleanedIngredients = ingredients
    .replace(/\s+/g, ' ')
    .trim();
  
  const shouldTruncate = cleanedIngredients.length > 200;
  const displayText = shouldTruncate && !isExpanded
    ? cleanedIngredients.slice(0, 200) + '...'
    : cleanedIngredients;

  // Parse ingredients and highlight avoided terms
  const segments = parseIngredientsWithHighlights(displayText, avoidTerms);
  const hasAvoidedIngredients = segments.some((s) => s.isAvoided);

  return (
    <YStack>
      <XStack alignItems="center" gap="$2" marginBottom="$2">
        <Text fontSize="$3" fontWeight="600" color="$color">
          Ingredients
        </Text>
        {hasAvoidedIngredients && (
          <Text fontSize="$2" color="#EF4444" fontWeight="500">
            (contains items to avoid)
          </Text>
        )}
      </XStack>
      <Text fontSize="$3" color="$colorHover" lineHeight={20}>
        {segments.map((segment, index) => (
          <Text
            key={index}
            color={segment.isAvoided ? '#EF4444' : '$colorHover'}
            fontWeight={segment.isAvoided ? '700' : undefined}
            backgroundColor={segment.isAvoided ? '#EF444420' : undefined}
          >
            {segment.text}
          </Text>
        ))}
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
