import { ChevronDown, ChevronUp, Clock, Trash2 } from '@tamagui/lucide-icons';
import { memo, useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Button, Card, Separator, Text, XStack, YStack } from 'tamagui';

import { SwipeableDateHeader } from '../../src/components';
import {
    useActiveFast,
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

// Generate time options for the past 12 hours in 30-minute intervals
function generateTimeOptions(): { label: string; value: Date }[] {
  const now = new Date();
  const options: { label: string; value: Date }[] = [];
  
  // Add "Now" option
  options.push({ label: 'Now', value: now });
  
  // Add past times in 30-minute intervals (up to 12 hours back)
  for (let i = 1; i <= 24; i++) {
    const time = new Date(now.getTime() - i * 30 * 60 * 1000);
    const label = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    options.push({ label, value: time });
  }
  
  return options;
}

export default function FastingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const selectedDate = useFastingStore((state) => state.selectedDate);
  const setSelectedDate = useFastingStore((state) => state.setSelectedDate);
  const startFast = useFastingStore((state) => state.startFast);
  const endFast = useFastingStore((state) => state.endFast);
  const deleteFast = useFastingStore((state) => state.deleteFast);

  const activeFast = useActiveFast();
  const dateSessions = useSelectedDateSessions();

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeOptions, setTimeOptions] = useState<{ label: string; value: Date }[]>([]);

  // Live timer update
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Refresh time options when picker opens
  useEffect(() => {
    if (showTimePicker) {
      setTimeOptions(generateTimeOptions());
    }
  }, [showTimePicker]);

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

  // Progress color based on completion
  const progressColor = progress >= 100 ? '#10B981' : '#3B82F6';
  const trackColor = isDark ? '#374151' : '#E5E7EB';

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
                  fill="transparent"
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
              <Text fontSize="$3" color="$colorHover">
                Goal: {formatGoalTime(activeFast.startTime, activeFast.goalDuration)}
              </Text>
            ) : (
              <Text fontSize="$3" color="$colorHover">
                Goal: 23.5h
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
                  backgroundColor="#10B981"
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
                  {showTimePicker ? (
                    <ChevronUp size={14} color="$colorHover" />
                  ) : (
                    <ChevronDown size={14} color="$colorHover" />
                  )}
                </Button>

                {/* Time picker options */}
                {showTimePicker && (
                  <Card
                    bordered
                    padding="$2"
                    backgroundColor="$background"
                    width="100%"
                    maxHeight={200}
                  >
                    <YStack gap="$1">
                      {timeOptions.map((option, index) => (
                        <Button
                          key={index}
                          size="$3"
                          backgroundColor="transparent"
                          pressStyle={{ backgroundColor: '$backgroundHover' }}
                          onPress={() => handleStartFast(option.value)}
                        >
                          <Text fontSize="$3" color="$color">
                            {option.label}
                          </Text>
                        </Button>
                      ))}
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
  showSeparator,
  onDelete,
}: {
  session: FastingSession;
  currentTime: number;
  isActive: boolean;
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
              <Text fontSize="$2" color="#10B981" fontWeight="600">
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
