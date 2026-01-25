import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons';
import { useCallback, useRef } from 'react';
import { RefreshControl, ScrollView, useColorScheme } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, H2, XStack, YStack } from 'tamagui';

import { addDays, getRelativeDateLabel, getTodayKey, isToday, isYesterday } from '../utils/date';

interface SwipeableDateHeaderProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  /** Optional content to render on the right side (e.g., sync status) */
  rightContent?: React.ReactNode;
  /** Content to render below the header (the page content) */
  children: React.ReactNode;
  /** Whether pull-to-refresh is active */
  refreshing?: boolean;
  /** Callback when user pulls to refresh */
  onRefresh?: () => void;
}

const SWIPE_THRESHOLD = 100;

export function SwipeableDateHeader({
  selectedDate,
  onDateChange,
  rightContent,
  children,
  refreshing,
  onRefresh,
}: SwipeableDateHeaderProps) {
  const viewingToday = isToday(selectedDate);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  
  // Use refs for gesture handler callbacks
  const selectedDateRef = useRef(selectedDate);
  const onDateChangeRef = useRef(onDateChange);
  const viewingTodayRef = useRef(viewingToday);
  
  selectedDateRef.current = selectedDate;
  onDateChangeRef.current = onDateChange;
  viewingTodayRef.current = viewingToday;

  const translateX = useSharedValue(0);

  const goToPreviousDay = useCallback(() => {
    onDateChangeRef.current(addDays(selectedDateRef.current, -1));
  }, []);

  const goToNextDay = useCallback(() => {
    if (!viewingTodayRef.current) {
      onDateChangeRef.current(addDays(selectedDateRef.current, 1));
    }
  }, []);

  const goToToday = useCallback(() => {
    onDateChangeRef.current(getTodayKey());
  }, []);

  // Horizontal pan gesture for swiping between days
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX * 0.3;
    })
    .onEnd((event) => {
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(goToPreviousDay)();
      } else if (event.translationX < -SWIPE_THRESHOLD && !viewingTodayRef.current) {
        runOnJS(goToNextDay)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }, animatedStyle]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingTop: 16 + insets.top }}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing ?? false}
                onRefresh={onRefresh}
                colors={['#10B981']}
                tintColor="#10B981"
              />
            ) : undefined
          }
        >
          {/* Date Header */}
          <YStack marginBottom="$4" gap="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap="$2" flex={1}>
                {/* Previous Day Button */}
                <Button
                  size="$3"
                  circular
                  backgroundColor="transparent"
                  pressStyle={{ backgroundColor: '$backgroundHover' }}
                  onPress={goToPreviousDay}
                >
                  <ChevronLeft size={24} color="$color" />
                </Button>

                {/* Date Label */}
                <YStack flex={1} alignItems="center">
                  <H2 color="$color" textAlign="center">
                    {getRelativeDateLabel(selectedDate)}
                  </H2>
                </YStack>

                {/* Next Day Button (disabled if viewing today) */}
                <Button
                  size="$3"
                  circular
                  backgroundColor="transparent"
                  pressStyle={{ backgroundColor: viewingToday ? 'transparent' : '$backgroundHover' }}
                  onPress={goToNextDay}
                  disabled={viewingToday}
                  opacity={viewingToday ? 0.3 : 1}
                >
                  <ChevronRight size={24} color="$color" />
                </Button>
              </XStack>

              {/* Optional right content (sync status, entry count, etc.) */}
              {rightContent}
            </XStack>

            {/* Today Button - shown when not viewing today or yesterday */}
            {!viewingToday && !isYesterday(selectedDate) && (
              <XStack justifyContent="center">
                <Button
                  size="$2"
                  backgroundColor="#10B981"
                  color="white"
                  onPress={goToToday}
                  paddingHorizontal="$4"
                >
                  Go to Today
                </Button>
              </XStack>
            )}
          </YStack>

          {/* Page content */}
          {children}
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}
