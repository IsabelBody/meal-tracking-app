import { Check, Pencil, Trash2, X } from '@tamagui/lucide-icons';
import { useCallback, useMemo, useState } from 'react';
import { Keyboard, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Input, ScrollView, Text, XStack, YStack } from 'tamagui';

import { useWeightStore } from '../../src/stores/weight.store';
import { WeightEntry } from '../../src/types/weight';
import { getTodayKey } from '../../src/utils/date';

export default function WeightScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const entries = useWeightStore((state) => state.entries);
  const logWeight = useWeightStore((state) => state.logWeight);
  const updateWeight = useWeightStore((state) => state.updateWeight);
  const deleteWeight = useWeightStore((state) => state.deleteWeight);
  const setSelectedDate = useWeightStore((state) => state.setSelectedDate);

  const todayKey = getTodayKey();
  const todayEntry = entries[todayKey];

  // Form state for today's entry
  const [weightInput, setWeightInput] = useState('');

  // Edit mode state
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');

  // Get sorted entries (newest first)
  const sortedEntries = useMemo(() => {
    return Object.values(entries).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [entries]);

  const handleLogToday = useCallback(() => {
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) return;

    setSelectedDate(todayKey);
    logWeight(weight, 'kg');
    setWeightInput('');
    Keyboard.dismiss();
  }, [weightInput, logWeight, setSelectedDate, todayKey]);

  const handleStartEdit = useCallback((entry: WeightEntry) => {
    setEditingDate(entry.date);
    setEditWeight(entry.weight.toString());
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingDate(null);
    setEditWeight('');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingDate) return;
    const weight = parseFloat(editWeight);
    if (isNaN(weight) || weight <= 0) return;

    updateWeight(editingDate, weight, 'kg');
    handleCancelEdit();
    Keyboard.dismiss();
  }, [editingDate, editWeight, updateWeight, handleCancelEdit]);

  const handleDelete = useCallback((date: string) => {
    deleteWeight(date);
    if (editingDate === date) {
      handleCancelEdit();
    }
  }, [deleteWeight, editingDate, handleCancelEdit]);

  const isValidWeight = (value: string) => {
    const weight = parseFloat(value);
    return !isNaN(weight) && weight > 0;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === todayKey) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';

    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateChange = (currentEntry: WeightEntry, index: number) => {
    if (index >= sortedEntries.length - 1) return null;
    const previousEntry = sortedEntries[index + 1];
    const change = currentEntry.weight - previousEntry.weight;
    return change;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor={isDark ? '#000' : '#F3F4F6'}>
        <YStack padding="$4" gap="$4">
          {/* Header */}
          <Text fontSize="$8" fontWeight="700" color="$color">
            Weight Diary
          </Text>

          {/* Log Today's Weight Card */}
          {!todayEntry && (
            <Card
              elevate
              bordered
              padding="$4"
              backgroundColor="$background"
            >
              <YStack gap="$3">
                <Text fontWeight="600" fontSize="$5" color="$color">
                  Log Today's Weight
                </Text>

                <XStack gap="$3" alignItems="flex-end">
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$2" color="$colorHover">Weight (kg)</Text>
                    <Input
                      size="$4"
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      value={weightInput}
                      onChangeText={setWeightInput}
                      backgroundColor={isDark ? '#1F2937' : '#F9FAFB'}
                      borderColor={isDark ? '#374151' : '#E5E7EB'}
                      color="$color"
                    />
                  </YStack>
                  <Button
                    size="$4"
                    backgroundColor={isValidWeight(weightInput) ? '#10B981' : isDark ? '#374151' : '#E5E7EB'}
                    pressStyle={{ backgroundColor: isValidWeight(weightInput) ? '#059669' : undefined }}
                    onPress={handleLogToday}
                    disabled={!isValidWeight(weightInput)}
                  >
                    <Text color={isValidWeight(weightInput) ? 'white' : '$colorHover'} fontWeight="600">
                      Log
                    </Text>
                  </Button>
                </XStack>
              </YStack>
            </Card>
          )}

          {/* Entries List */}
          {sortedEntries.length > 0 ? (
            <YStack gap="$3">
              <Text fontSize="$4" fontWeight="600" color="$colorHover">
                History
              </Text>

              {sortedEntries.map((entry, index) => {
                const isEditing = editingDate === entry.date;
                const change = calculateChange(entry, index);

                return (
                  <Card
                    key={entry.id}
                    bordered
                    padding="$3"
                    backgroundColor="$background"
                  >
                    {isEditing ? (
                      // Edit mode
                      <YStack gap="$3">
                        <XStack justifyContent="space-between" alignItems="center">
                          <Text fontWeight="600" color="$color">
                            {formatDate(entry.date)}
                          </Text>
                          <XStack gap="$2">
                            <Button
                              size="$2"
                              circular
                              backgroundColor="transparent"
                              onPress={handleCancelEdit}
                            >
                              <X size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            </Button>
                            <Button
                              size="$2"
                              circular
                              backgroundColor={isValidWeight(editWeight) ? '#10B981' : 'transparent'}
                              onPress={handleSaveEdit}
                              disabled={!isValidWeight(editWeight)}
                            >
                              <Check size={18} color={isValidWeight(editWeight) ? 'white' : '#9CA3AF'} />
                            </Button>
                          </XStack>
                        </XStack>

                        <XStack gap="$2" alignItems="center">
                          <Input
                            flex={1}
                            size="$3"
                            keyboardType="decimal-pad"
                            value={editWeight}
                            onChangeText={setEditWeight}
                            backgroundColor={isDark ? '#1F2937' : '#F9FAFB'}
                            borderColor={isDark ? '#374151' : '#E5E7EB'}
                            color="$color"
                          />
                          <Text color="$colorHover">kg</Text>
                        </XStack>

                        <Button
                          size="$3"
                          backgroundColor="#EF4444"
                          pressStyle={{ backgroundColor: '#DC2626' }}
                          onPress={() => handleDelete(entry.date)}
                          icon={<Trash2 size={16} color="white" />}
                        >
                          <Text color="white" fontSize="$3">Delete Entry</Text>
                        </Button>
                      </YStack>
                    ) : (
                      // View mode
                      <XStack justifyContent="space-between" alignItems="center">
                        <YStack gap="$1" flex={1}>
                          <XStack alignItems="baseline" gap="$2">
                            <Text fontWeight="600" color="$color">
                              {formatDate(entry.date)}
                            </Text>
                            {entry.date === todayKey && (
                              <Text fontSize="$2" color="#10B981" fontWeight="500">
                                Latest
                              </Text>
                            )}
                          </XStack>
                          {entry.notes && (
                            <Text fontSize="$2" color="$colorHover" numberOfLines={2}>
                              {entry.notes}
                            </Text>
                          )}
                        </YStack>

                        <XStack alignItems="center" gap="$3">
                          <YStack alignItems="flex-end">
                            <Text fontSize="$6" fontWeight="700" color="$color">
                              {entry.weight}
                            </Text>
                            <XStack alignItems="center" gap="$1">
                              <Text fontSize="$2" color="$colorHover">kg</Text>
                              {change !== null && (
                                <Text 
                                  fontSize="$2" 
                                  color={change > 0 ? '#EF4444' : change < 0 ? '#10B981' : '$colorHover'}
                                  fontWeight="500"
                                >
                                  {change > 0 ? '+' : ''}{change.toFixed(1)}
                                </Text>
                              )}
                            </XStack>
                          </YStack>

                          <Button
                            size="$2"
                            circular
                            backgroundColor="transparent"
                            onPress={() => handleStartEdit(entry)}
                          >
                            <Pencil size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                          </Button>
                        </XStack>
                      </XStack>
                    )}
                  </Card>
                );
              })}
            </YStack>
          ) : (
            // Empty state
            <YStack alignItems="center" gap="$4" paddingVertical="$8">
              <Text fontSize="$5" color="$colorHover">
                No entries yet
              </Text>
              <Text fontSize="$3" color="$colorHover" textAlign="center">
                Start tracking your weight by logging your first entry above.
              </Text>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
