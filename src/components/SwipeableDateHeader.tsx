import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons';
import { useCallback, useRef } from 'react';
import { Animated, PanResponder, RefreshControl, useColorScheme } from 'react-native';
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

const SWIPE_THRESHOLD = 80;

export function SwipeableDateHeader({
  selectedDate,
  onDateChange,
  rightContent,
  children,
  refreshing,
  onRefresh,
}: SwipeableDateHeaderProps) {
  const viewingToday = isToday(selectedDate);
  const translateX = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const goToPreviousDay = useCallback(() => {
    onDateChange(addDays(selectedDate, -1));
  }, [selectedDate, onDateChange]);

  const goToNextDay = useCallback(() => {
    if (!viewingToday) {
      onDateChange(addDays(selectedDate, 1));
    }
  }, [selectedDate, onDateChange, viewingToday]);

  const goToToday = useCallback(() => {
    onDateChange(getTodayKey());
  }, [onDateChange]);

  // Create pan responder that detects horizontal swipes
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal gestures that are more horizontal than vertical
        // This allows vertical scrolling to work normally
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        const isSignificant = Math.abs(gestureState.dx) > 15;
        return isHorizontal && isSignificant;
      },
      onPanResponderGrant: () => {
        translateX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Limit the swipe distance for visual feedback
        const clampedDx = Math.max(-120, Math.min(120, gestureState.dx * 0.4));
        translateX.setValue(clampedDx);
      },
      onPanResponderRelease: (_, gestureState) => {
        // Animate back to center
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();

        // Determine if swipe was significant enough
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swiped right -> go to previous day
          goToPreviousDay();
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swiped left -> go to next day (if not viewing today)
          goToNextDay();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.ScrollView
      style={{ 
        flex: 1, 
        backgroundColor: isDark ? '#111827' : '#F9FAFB',
        transform: [{ translateX }],
      }}
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
      {...panResponder.panHandlers}
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
    </Animated.ScrollView>
  );
}
