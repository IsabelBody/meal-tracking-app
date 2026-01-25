import { memo } from 'react';
import { Progress, Text, XStack, YStack } from 'tamagui';

/**
 * Standardized macro color scheme used across the app
 */
export const MACRO_COLORS = {
  calories: '#10B981',
  protein: '#EF4444',
  carbs: '#3B82F6',
  fat: '#F59E0B',
} as const;

export type MacroType = keyof typeof MACRO_COLORS;

/**
 * Standard formatting for macro values
 */
export const formatMacroValue = (value: number, decimals: number = 1): string => {
  if (decimals === 0) {
    return Math.round(value).toString();
  }
  return (Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toString();
};

// ============================================================================
// MacroCircle - Circular badge display (for food detail screens)
// ============================================================================

interface MacroCircleProps {
  label: string;
  value: number;
  unit?: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

const CIRCLE_SIZES = {
  sm: { outer: 56, border: 2, fontSize: '$3', unitSize: '$1' },
  md: { outer: 70, border: 3, fontSize: '$4', unitSize: '$1' },
  lg: { outer: 84, border: 4, fontSize: '$5', unitSize: '$2' },
} as const;

export const MacroCircle = memo(function MacroCircle({
  label,
  value,
  unit = '',
  color,
  size = 'md',
}: MacroCircleProps) {
  const sizeConfig = CIRCLE_SIZES[size];
  const radius = sizeConfig.outer / 2;

  return (
    <YStack alignItems="center" minWidth={sizeConfig.outer}>
      <YStack
        width={sizeConfig.outer}
        height={sizeConfig.outer}
        borderRadius={radius}
        backgroundColor={`${color}15`}
        borderWidth={sizeConfig.border}
        borderColor={color}
        justifyContent="center"
        alignItems="center"
      >
        <Text fontSize={sizeConfig.fontSize} fontWeight="700" color={color}>
          {formatMacroValue(value, unit ? 1 : 0)}
        </Text>
        {unit && (
          <Text fontSize={sizeConfig.unitSize} color={color}>
            {unit}
          </Text>
        )}
      </YStack>
      <Text fontSize="$2" color="$colorHover" marginTop="$1">
        {label}
      </Text>
    </YStack>
  );
});

// ============================================================================
// MacroItem - Simple vertical stack (for previews, scanner results)
// ============================================================================

interface MacroItemProps {
  label: string;
  value: number;
  unit?: string;
  color: string;
}

export const MacroItem = memo(function MacroItem({
  label,
  value,
  unit = '',
  color,
}: MacroItemProps) {
  const displayValue = unit
    ? `${formatMacroValue(value, 1)}${unit}`
    : formatMacroValue(value, 0);

  return (
    <YStack alignItems="center" flex={1} minWidth={50} maxWidth={80}>
      <Text fontSize="$5" fontWeight="700" color={color}>
        {displayValue}
      </Text>
      <Text fontSize="$2" color="$colorHover">
        {label}
      </Text>
    </YStack>
  );
});

// ============================================================================
// MacroProgress - With progress bar (for dashboard/tracking)
// ============================================================================

interface MacroProgressProps {
  label: string;
  current: number;
  goal: number;
  color: string;
  showGoal?: boolean;
}

export const MacroProgress = memo(function MacroProgress({
  label,
  current,
  goal,
  color,
  showGoal = true,
}: MacroProgressProps) {
  const progress = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;

  return (
    <YStack alignItems="center" flex={1} minWidth={60} maxWidth={100} gap="$2">
      <Text fontSize="$2" color="$colorHover">
        {label}
      </Text>
      <YStack width="100%">
        <Progress
          value={progress}
          backgroundColor="$backgroundHover"
          height={6}
          width="100%"
        >
          <Progress.Indicator backgroundColor={color} />
        </Progress>
      </YStack>
      <Text fontSize="$3" fontWeight="600" color="$color">
        {Math.round(current)}g
      </Text>
      {showGoal && (
        <Text fontSize="$1" color="$colorHover">
          / {goal}g
        </Text>
      )}
    </YStack>
  );
});

// ============================================================================
// MacroCompact - Inline text display (for search results, lists)
// ============================================================================

interface MacroCompactProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  showLabels?: boolean;
}

export const MacroCompact = memo(function MacroCompact({
  calories,
  protein,
  carbs,
  fat,
  showLabels = true,
}: MacroCompactProps) {
  return (
    <XStack gap="$2" flexWrap="wrap">
      <Text fontSize="$2" color={MACRO_COLORS.calories}>
        {Math.round(calories)} cal
      </Text>
      <Text fontSize="$2" color="$colorHover">
        {showLabels ? 'P: ' : ''}{Math.round(protein)}g
      </Text>
      <Text fontSize="$2" color="$colorHover">
        {showLabels ? 'C: ' : ''}{Math.round(carbs)}g
      </Text>
      <Text fontSize="$2" color="$colorHover">
        {showLabels ? 'F: ' : ''}{Math.round(fat)}g
      </Text>
    </XStack>
  );
});

// ============================================================================
// MacroRow - Horizontal layout for detailed nutrient rows
// ============================================================================

interface MacroRowProps {
  label: string;
  value: number;
  unit: string;
}

export const MacroRow = memo(function MacroRow({
  label,
  value,
  unit,
}: MacroRowProps) {
  return (
    <XStack justifyContent="space-between" paddingVertical="$1">
      <Text color="$colorHover">{label}</Text>
      <Text fontWeight="500" color="$color">
        {formatMacroValue(value, 1)}{unit}
      </Text>
    </XStack>
  );
});

// ============================================================================
// MacroCircleGroup - Pre-composed layout for 4 main macros as circles
// ============================================================================

interface MacroCircleGroupProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  size?: 'sm' | 'md' | 'lg';
}

export const MacroCircleGroup = memo(function MacroCircleGroup({
  calories,
  protein,
  carbs,
  fat,
  size = 'md',
}: MacroCircleGroupProps) {
  return (
    <XStack justifyContent="space-between" width="100%" paddingHorizontal="$1">
      <MacroCircle
        label="Calories"
        value={calories}
        unit=""
        color={MACRO_COLORS.calories}
        size={size}
      />
      <MacroCircle
        label="Protein"
        value={protein}
        unit="g"
        color={MACRO_COLORS.protein}
        size={size}
      />
      <MacroCircle
        label="Carbs"
        value={carbs}
        unit="g"
        color={MACRO_COLORS.carbs}
        size={size}
      />
      <MacroCircle
        label="Fat"
        value={fat}
        unit="g"
        color={MACRO_COLORS.fat}
        size={size}
      />
    </XStack>
  );
});

// ============================================================================
// MacroItemGroup - Pre-composed layout for 4 main macros as simple items
// ============================================================================

interface MacroItemGroupProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const MacroItemGroup = memo(function MacroItemGroup({
  calories,
  protein,
  carbs,
  fat,
}: MacroItemGroupProps) {
  return (
    <XStack justifyContent="space-between" width="100%" paddingHorizontal="$1">
      <MacroItem
        label="Calories"
        value={calories}
        color={MACRO_COLORS.calories}
      />
      <MacroItem
        label="Protein"
        value={protein}
        unit="g"
        color={MACRO_COLORS.protein}
      />
      <MacroItem
        label="Carbs"
        value={carbs}
        unit="g"
        color={MACRO_COLORS.carbs}
      />
      <MacroItem
        label="Fat"
        value={fat}
        unit="g"
        color={MACRO_COLORS.fat}
      />
    </XStack>
  );
});

// ============================================================================
// MacroProgressGroup - Pre-composed layout for tracking macros with progress
// ============================================================================

interface MacroProgressGroupProps {
  current: {
    protein: number;
    carbs: number;
    fat: number;
  };
  goals: {
    protein: number;
    carbs: number;
    fat: number;
  };
  progress: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const MacroProgressGroup = memo(function MacroProgressGroup({
  current,
  goals,
}: MacroProgressGroupProps) {
  return (
    <XStack justifyContent="space-between" width="100%" paddingHorizontal="$2">
      <MacroProgress
        label="Protein"
        current={current.protein}
        goal={goals.protein}
        color={MACRO_COLORS.protein}
      />
      <MacroProgress
        label="Carbs"
        current={current.carbs}
        goal={goals.carbs}
        color={MACRO_COLORS.carbs}
      />
      <MacroProgress
        label="Fat"
        current={current.fat}
        goal={goals.fat}
        color={MACRO_COLORS.fat}
      />
    </XStack>
  );
});
