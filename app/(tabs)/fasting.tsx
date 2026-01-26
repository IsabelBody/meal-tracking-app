import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Clock, Pencil, Trash2 } from '@tamagui/lucide-icons';
import { memo, useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, useColorScheme } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Button, Card, Separator, Text, XStack, YStack } from 'tamagui';

import { SwipeableDateHeader } from '../../src/components';
import {
    useActiveFast,
    useFastingHydrated,
    useFastingProgress,
    useFastingStore,
    useSelectedDateSessions,
} from '../../src/stores/fasting.store';
import { FastingSession, formatFastDuration, formatFastDurationShort } from '../../src/types/fasting';
import { isToday } from '../../src/utils/date';

const CIRCLE_SIZE = 280;
const STROKE_WIDTH = 16;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatGoalTime(startTime: string, goalDuration: number): string {
  const goalDate = new Date(new Date(startTime).getTime() + goalDuration);
  const dayName = goalDate.toLocaleDateString([], { weekday: 'long' });
  const time = goalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dayName} ${time}`;
}

export default function FastingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const selectedDate = useFastingStore((state) => state.selectedDate);
  const setSelectedDate = useFastingStore((state) => state.setSelectedDate);
  const startFast = useFastingStore((state) => state.startFast);
  const endFast = useFastingStore((state) => state.endFast);
  const deleteFast = useFastingStore((state) => state.deleteFast);
  const updateFastGoal = useFastingStore((state) => state.updateFastGoal);

  const hasHydrated = useFastingHydrated();
  const activeFast = useActiveFast();
  const dateSessions = useSelectedDateSessions();

  // Time picker state for start time
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());

  // Goal time picker state
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [selectedGoalTime, setSelectedGoalTime] = useState(new Date());

  // Live timer update
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Reset selected time when picker opens
  useEffect(() => {
    if (showTimePicker) {
      setSelectedTime(new Date());
    }
  }, [showTimePicker]);

  // Initialize goal time picker with current goal end time
  useEffect(() => {
    if (showGoalPicker && activeFast) {
      const goalEndTime = new Date(new Date(activeFast.startTime).getTime() + activeFast.goalDuration);
      setSelectedGoalTime(goalEndTime);
    }
  }, [showGoalPicker, activeFast]);

  // Determine display state
  const viewingToday = isToday(selectedDate);
  const isActiveFastOnDisplay = viewingToday && activeFast !== null;

  // For the circular timer, show active fast progress or 0
  const { elapsed, progress } = useFastingProgress(
    isActiveFastOnDisplay ? activeFast : null,
    currentTime
  );

  // Calculate stroke dash offset for progress ring
  const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  const handleStartFast = useCallback((customTime?: Date) => {
    setCurrentTime(Date.now());
    if (customTime) {
      startFast(customTime.toISOString());
    } else {
      startFast();
    }
    setShowTimePicker(false);
  }, [startFast]);

  const handleEndFast = useCallback(() => {
    endFast();
  }, [endFast]);

  const toggleTimePicker = useCallback(() => {
    setShowTimePicker((prev) => !prev);
  }, []);

  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      // On Android, the picker closes automatically after selection
      if (Platform.OS === 'android') {
        setShowTimePicker(false);
        if (event.type === 'set' && date) {
          handleStartFast(date);
        }
      } else if (date) {
        // On iOS, update the selected time as the user scrolls
        setSelectedTime(date);
      }
    },
    [handleStartFast]
  );

  const handleConfirmTime = useCallback(() => {
    handleStartFast(selectedTime);
  }, [handleStartFast, selectedTime]);

  const handleGoalTimeChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') {
        setShowGoalPicker(false);
        if (event.type === 'set' && date && activeFast) {
          const startTime = new Date(activeFast.startTime).getTime();
          const newGoalDuration = date.getTime() - startTime;
          if (newGoalDuration > 0) {
            updateFastGoal(activeFast.id, newGoalDuration);
          }
        }
      } else if (date) {
        setSelectedGoalTime(date);
      }
    },
    [activeFast, updateFastGoal]
  );

  const handleConfirmGoalTime = useCallback(() => {
    if (activeFast) {
      const startTime = new Date(activeFast.startTime).getTime();
      const newGoalDuration = selectedGoalTime.getTime() - startTime;
      if (newGoalDuration > 0) {
        updateFastGoal(activeFast.id, newGoalDuration);
      }
    }
    setShowGoalPicker(false);
  }, [activeFast, selectedGoalTime, updateFastGoal]);

  // Traffic light color scheme based on progress
  const getTrafficLightColors = (progressPercent: number) => {
    if (progressPercent >= 100) {
      // Goal reached - green
      return {
        stroke: '#2D6A4F', // Dark calming green
        fill: isDark ? '#1B4332' : '#D8F3DC', // Light green fill
      };
    } else if (progressPercent >= 50) {
      // Middle of fast - orange/amber
      return {
        stroke: '#B45309', // Dark amber
        fill: isDark ? '#78350F' : '#FEF3C7', // Light amber fill
      };
    } else {
      // Start of fast - red
      return {
        stroke: '#B91C1C', // Dark red
        fill: isDark ? '#7F1D1D' : '#FEE2E2', // Light red fill
      };
    }
  };

  const trafficColors = getTrafficLightColors(progress);
  const progressColor = trafficColors.stroke;
  const circleFillColor = isActiveFastOnDisplay ? trafficColors.fill : 'transparent';
  const trackColor = isDark ? '#374151' : '#E5E7EB';

  // Show loading state while hydrating to prevent flash of "no active fast"
  if (!hasHydrated) {
    return (
      <SwipeableDateHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      >
        <YStack flex={1} alignItems="center" justifyContent="center" paddingTop="$4">
          <Text color="$colorHover">Loading...</Text>
        </YStack>
      </SwipeableDateHeader>
    );
  }

  return (
    <SwipeableDateHeader
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
    >
      <YStack flex={1} alignItems="center" gap="$4" paddingTop="$4">
        {/* Only show timer UI when viewing today */}
        {viewingToday && (
          <>
            {/* Circular Progress Timer */}
            <YStack alignItems="center" justifyContent="center">
              <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
                {/* Background track */}
                <Circle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={RADIUS}
                  stroke={trackColor}
                  strokeWidth={STROKE_WIDTH}
                  fill={circleFillColor}
                />
                {/* Progress arc */}
                <Circle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={RADIUS}
                  stroke={isActiveFastOnDisplay ? progressColor : trackColor}
                  strokeWidth={STROKE_WIDTH}
                  fill="transparent"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={isActiveFastOnDisplay ? strokeDashoffset : CIRCUMFERENCE}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                />
              </Svg>

              {/* Timer text overlay */}
              <YStack
                position="absolute"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="$10" fontWeight="700" color="$color" fontFamily="$mono">
                  {formatFastDuration(elapsed)}
                </Text>
                {isActiveFastOnDisplay && (
                  <Text fontSize="$4" color="$colorHover" marginTop="$1">
                    {progress >= 100 ? 'Goal reached!' : `${Math.round(progress)}%`}
                  </Text>
                )}
              </YStack>
            </YStack>

            {/* Goal info - show goal time if fasting */}
            {isActiveFastOnDisplay && activeFast ? (
              <YStack alignItems="center" gap="$2">
                <Pressable onPress={() => setShowGoalPicker(true)}>
                  <XStack alignItems="center" gap="$1">
                    <Text fontSize="$3" color="$colorHover">
                      Goal: {formatGoalTime(activeFast.startTime, activeFast.goalDuration)}
                    </Text>
                    <Pencil size={12} color="$colorHover" />
                  </XStack>
                </Pressable>

                {/* Goal time picker */}
                {showGoalPicker && (
                  <Card
                    bordered
                    padding="$3"
                    backgroundColor="$background"
                    width="100%"
                  >
                    <YStack gap="$3" alignItems="center">
                      <Text fontSize="$3" color="$colorHover">
                        Set goal end time
                      </Text>
                      <DateTimePicker
                        value={selectedGoalTime}
                        mode="datetime"
                        is24Hour={false}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleGoalTimeChange}
                        minimumDate={new Date(activeFast.startTime)}
                        themeVariant={isDark ? 'dark' : 'light'}
                      />
                      {Platform.OS === 'ios' && (
                        <XStack gap="$3">
                          <Button
                            size="$3"
                            backgroundColor="$backgroundHover"
                            onPress={() => setShowGoalPicker(false)}
                            flex={1}
                          >
                            <Text color="$color">Cancel</Text>
                          </Button>
                          <Button
                            size="$3"
                            backgroundColor="#2D6A4F"
                            onPress={handleConfirmGoalTime}
                            flex={1}
                          >
                            <Text color="white">Update Goal</Text>
                          </Button>
                        </XStack>
                      )}
                    </YStack>
                  </Card>
                )}
              </YStack>
            ) : (
              <Text fontSize="$3" color="$colorHover">
                Goal: 23h
              </Text>
            )}

            {/* Action buttons */}
            {isActiveFastOnDisplay ? (
              <Button
                size="$5"
                backgroundColor="#EF4444"
                color="white"
                onPress={handleEndFast}
                paddingHorizontal="$8"
              >
                End Fast
              </Button>
            ) : (
              <YStack gap="$2" alignItems="center" width="100%">
                <Button
                  size="$5"
                  backgroundColor="#2D6A4F"
                  color="white"
                  onPress={() => handleStartFast()}
                  paddingHorizontal="$8"
                >
                  Start Fast
                </Button>
                
                {/* Subtle time picker toggle */}
                <Button
                  size="$2"
                  backgroundColor="transparent"
                  pressStyle={{ backgroundColor: '$backgroundHover' }}
                  onPress={toggleTimePicker}
                  icon={<Clock size={14} color="$colorHover" />}
                >
                  <Text fontSize="$2" color="$colorHover">
                    Started earlier?
                  </Text>
                </Button>

                {/* Time picker */}
                {showTimePicker && (
                  <Card
                    bordered
                    padding="$3"
                    backgroundColor="$background"
                    width="100%"
                  >
                    <YStack gap="$3" alignItems="center">
                      <Text fontSize="$3" color="$colorHover">
                        Select start time
                      </Text>
                      <DateTimePicker
                        value={selectedTime}
                        mode="time"
                        is24Hour={false}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleTimeChange}
                        maximumDate={new Date()}
                        themeVariant={isDark ? 'dark' : 'light'}
                      />
                      {Platform.OS === 'ios' && (
                        <XStack gap="$3">
                          <Button
                            size="$3"
                            backgroundColor="$backgroundHover"
                            onPress={() => setShowTimePicker(false)}
                            flex={1}
                          >
                            <Text color="$color">Cancel</Text>
                          </Button>
                          <Button
                            size="$3"
                            backgroundColor="#2D6A4F"
                            onPress={handleConfirmTime}
                            flex={1}
                          >
                            <Text color="white">Start Fast</Text>
                          </Button>
                        </XStack>
                      )}
                    </YStack>
                  </Card>
                )}
              </YStack>
            )}
          </>
        )}

        {/* Past date: show message if no fasts */}
        {!viewingToday && dateSessions.length === 0 && (
          <YStack alignItems="center" gap="$4" paddingVertical="$6">
            <Text fontSize="$5" color="$colorHover">
              No fasts recorded
            </Text>
          </YStack>
        )}

        {/* Fasting history for this day - diary style */}
        {dateSessions.length > 0 && (
          <Card
            elevate
            bordered
            padding="$3"
            backgroundColor="$background"
            width="100%"
            marginTop="$2"
          >
            <Text fontWeight="600" fontSize="$4" color="$color" marginBottom="$2">
              Fasts
            </Text>
            <YStack gap="$2">
              {dateSessions.map((session, index) => (
                <FastEntry
                  key={session.id}
                  session={session}
                  currentTime={currentTime}
                  isActive={session.id === activeFast?.id}
                  activeColor={progressColor}
                  showSeparator={index < dateSessions.length - 1}
                  onDelete={() => deleteFast(session.id)}
                />
              ))}
            </YStack>
          </Card>
        )}
      </YStack>
    </SwipeableDateHeader>
  );
}

const FastEntry = memo(function FastEntry({
  session,
  currentTime,
  isActive,
  activeColor,
  showSeparator,
  onDelete,
}: {
  session: FastingSession;
  currentTime: number;
  isActive: boolean;
  activeColor: string;
  showSeparator: boolean;
  onDelete: () => void;
}) {
  const startTime = new Date(session.startTime).getTime();
  const endTime = session.endTime ? new Date(session.endTime).getTime() : currentTime;
  const elapsed = Math.max(0, endTime - startTime);

  return (
    <>
      <XStack justifyContent="space-between" alignItems="center" paddingVertical="$2">
        <YStack flex={1}>
          <XStack alignItems="center" gap="$2">
            <Text fontSize="$3" color="$color">
              {new Date(session.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' - '}
              {session.endTime
                ? new Date(session.endTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'now'}
            </Text>
            {isActive && (
              <Text fontSize="$2" color={activeColor} fontWeight="600">
                Active
              </Text>
            )}
          </XStack>
        </YStack>
        <XStack alignItems="center" gap="$3">
          <Text fontSize="$3" color="$colorHover" fontWeight="600">
            {formatFastDurationShort(elapsed)}
          </Text>
          <Button
            size="$2"
            backgroundColor="transparent"
            pressStyle={{ backgroundColor: '$backgroundHover' }}
            onPress={onDelete}
            padding="$1"
          >
            <Trash2 size={16} color="#EF4444" />
          </Button>
        </XStack>
      </XStack>
      {showSeparator && <Separator />}
    </>
  );
});
