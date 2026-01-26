import { AlertCircle, Cloud, CloudOff, Plus, RefreshCw, Trash2 } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import {
    Button,
    Card,
    Progress,
    Separator,
    Text,
    XStack,
    YStack
} from 'tamagui';

import { SwipeableDateHeader } from '../../src/components';
import { useToast } from '../../src/contexts/toast';
import { useSync } from '../../src/hooks/useSync';
import { useAuthStore } from '../../src/stores/auth.store';
import { useDateEntries, useDiaryStore } from '../../src/stores/diary.store';
import { useGoalsStore, useNutritionProgress } from '../../src/stores/goals.store';
import { DiaryEntry } from '../../src/types';
import { formatTime } from '../../src/utils/date';
import { sumNutrition } from '../../src/utils/nutrition';

export default function DashboardScreen() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const selectedDate = useDiaryStore((state) => state.selectedDate);
  const setSelectedDate = useDiaryStore((state) => state.setSelectedDate);
  const diaryError = useDiaryStore((state) => state.error);
  const entries = useDateEntries(selectedDate);
  const goals = useGoalsStore((state) => state.goals);
  const goalsError = useGoalsStore((state) => state.error);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Initialize sync
  const { isSyncing, syncCurrentDate, fullSync } = useSync();
  
  // Show toast when sync errors occur
  useEffect(() => {
    if (diaryError) {
      showError(new Error(diaryError), 'Sync Error');
    }
  }, [diaryError, showError]);

  useEffect(() => {
    if (goalsError) {
      showError(new Error(goalsError), 'Goals Sync Error');
    }
  }, [goalsError, showError]);
  
  // Memoize expensive calculations
  const totals = useMemo(() => sumNutrition(entries), [entries]);
  const progress = useNutritionProgress(totals);

  const handleAddFood = useCallback(() => {
    router.push({
      pathname: '/add-food',
      params: { date: selectedDate },
    });
  }, [router, selectedDate]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    if (isAuthenticated) {
      await syncCurrentDate();
    }
  }, [isAuthenticated, syncCurrentDate]);

  // Retry sync after error
  const handleRetrySync = useCallback(async () => {
    if (isAuthenticated) {
      await fullSync();
    }
  }, [isAuthenticated, fullSync]);

  // Check if there's a sync error
  const hasSyncError = !!(diaryError || goalsError);

  // Sort entries by creation time (most recent first)
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [entries]);

  // Get delete handler
  const deleteEntry = useDiaryStore((state) => state.deleteEntry);
  const getAccessToken = useAuthStore((state) => state.getAccessToken);

  const handleDeleteEntry = useCallback(async (entryId: string) => {
    const token = await getAccessToken();
    await deleteEntry(entryId, selectedDate, token ?? undefined);
    showSuccess('Entry deleted');
  }, [deleteEntry, selectedDate, getAccessToken, showSuccess]);

  return (
    <SwipeableDateHeader
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      refreshing={isSyncing}
      onRefresh={handleRefresh}
      rightContent={
        isAuthenticated ? (
          hasSyncError ? (
            <XStack 
              alignItems="center" 
              gap="$1" 
              onPress={handleRetrySync}
              pressStyle={{ opacity: 0.7 }}
            >
              <AlertCircle size={16} color="#EF4444" />
              <Text fontSize="$1" color="#EF4444">Sync Error</Text>
              <RefreshCw size={12} color="#EF4444" />
            </XStack>
          ) : isSyncing ? (
            <XStack alignItems="center" gap="$1" opacity={0.6}>
              <RefreshCw size={16} color="#10B981" />
              <Text fontSize="$1" color="#10B981">Syncing...</Text>
            </XStack>
          ) : (
            <XStack alignItems="center" gap="$1" opacity={0.6}>
              <Cloud size={16} color="#10B981" />
              <Text fontSize="$1" color="#10B981">Synced</Text>
            </XStack>
          )
        ) : (
          <XStack alignItems="center" gap="$1" opacity={0.6}>
            <CloudOff size={16} color="$colorHover" />
            <Text fontSize="$1" color="$colorHover">Local</Text>
          </XStack>
        )
      }
    >
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

      {/* Food Diary */}
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
              Food Diary
            </Text>
            <Text fontSize="$3" color="$colorHover">
              {entries.length} {entries.length === 1 ? 'item' : 'items'}
            </Text>
          </YStack>
        </XStack>

        {sortedEntries.length > 0 && (
          <YStack marginTop="$3" gap="$2">
            <Separator />
            {sortedEntries.map((entry: DiaryEntry) => (
              <XStack
                key={entry.id}
                justifyContent="space-between"
                alignItems="center"
                paddingVertical="$2"
                gap="$2"
              >
                <YStack flex={1}>
                  <Text fontSize="$3" color="$color" numberOfLines={1}>
                    {entry.foodName}
                  </Text>
                  <Text fontSize="$2" color="$colorHover">
                    {formatTime(entry.createdAt)}
                  </Text>
                </YStack>
                <XStack alignItems="center" gap="$2">
                  <Text fontSize="$3" color="$colorHover">
                    {Math.round(entry.nutrition.calories)} cal
                  </Text>
                  <Button
                    size="$2"
                    circular
                    backgroundColor="transparent"
                    pressStyle={{ backgroundColor: '$backgroundHover' }}
                    onPress={() => handleDeleteEntry(entry.id)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </Button>
                </XStack>
              </XStack>
            ))}
          </YStack>
        )}

        {sortedEntries.length === 0 && (
          <YStack marginTop="$3" paddingVertical="$4" alignItems="center">
            <Text fontSize="$3" color="$colorHover">
              No foods logged yet
            </Text>
          </YStack>
        )}
      </Card>

      {/* Add Food Button */}
      <Button
        size="$5"
        backgroundColor="#10B981"
        color="white"
        icon={Plus}
        onPress={handleAddFood}
      >
        Add Food
      </Button>
    </SwipeableDateHeader>
  );
}
