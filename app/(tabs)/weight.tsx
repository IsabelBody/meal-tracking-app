import { Trash2 } from '@tamagui/lucide-icons';
import { useCallback, useState, useEffect } from 'react';
import { Keyboard, useColorScheme } from 'react-native';
import { Button, Card, Input, Separator, Text, TextArea, XStack, YStack } from 'tamagui';

import { SwipeableDateHeader } from '../../src/components';
import { useSelectedDateWeight, useWeightStore } from '../../src/stores/weight.store';
import { WeightUnit, convertWeight } from '../../src/types/weight';
import { isToday } from '../../src/utils/date';

export default function WeightScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const selectedDate = useWeightStore((state) => state.selectedDate);
  const setSelectedDate = useWeightStore((state) => state.setSelectedDate);
  const preferredUnit = useWeightStore((state) => state.preferredUnit);
  const setPreferredUnit = useWeightStore((state) => state.setPreferredUnit);
  const logWeight = useWeightStore((state) => state.logWeight);
  const deleteWeight = useWeightStore((state) => state.deleteWeight);

  const existingEntry = useSelectedDateWeight();

  // Local form state
  const [weightInput, setWeightInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [displayUnit, setDisplayUnit] = useState<WeightUnit>(preferredUnit);

  // Sync form with existing entry when date changes or entry loads
  useEffect(() => {
    if (existingEntry) {
      // Convert to display unit if needed
      const displayWeight = existingEntry.unit === displayUnit
        ? existingEntry.weight
        : convertWeight(existingEntry.weight, existingEntry.unit, displayUnit);
      setWeightInput(displayWeight.toString());
      setNotesInput(existingEntry.notes || '');
    } else {
      setWeightInput('');
      setNotesInput('');
    }
  }, [existingEntry, selectedDate, displayUnit]);

  // Sync display unit with preferred unit
  useEffect(() => {
    setDisplayUnit(preferredUnit);
  }, [preferredUnit]);

  const viewingToday = isToday(selectedDate);
  const hasEntry = !!existingEntry;

  const handleUnitToggle = useCallback((unit: WeightUnit) => {
    if (unit === displayUnit) return;
    
    // Convert current input value to new unit
    const currentValue = parseFloat(weightInput);
    if (!isNaN(currentValue) && currentValue > 0) {
      const convertedValue = convertWeight(currentValue, displayUnit, unit);
      setWeightInput(convertedValue.toString());
    }
    
    setDisplayUnit(unit);
    setPreferredUnit(unit);
  }, [displayUnit, weightInput, setPreferredUnit]);

  const handleSave = useCallback(() => {
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) return;

    logWeight(weight, displayUnit, notesInput.trim() || undefined);
    Keyboard.dismiss();
  }, [weightInput, displayUnit, notesInput, logWeight]);

  const handleDelete = useCallback(() => {
    deleteWeight(selectedDate);
    setWeightInput('');
    setNotesInput('');
  }, [selectedDate, deleteWeight]);

  const isValidWeight = () => {
    const weight = parseFloat(weightInput);
    return !isNaN(weight) && weight > 0;
  };

  return (
    <SwipeableDateHeader
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
    >
      <YStack flex={1} padding="$4" gap="$4">
        {/* Weight Entry Card */}
        <Card
          elevate
          bordered
          padding="$4"
          backgroundColor="$background"
        >
          <YStack gap="$4">
            <Text fontWeight="600" fontSize="$5" color="$color">
              {hasEntry ? 'Update Weight' : 'Log Weight'}
            </Text>

            {/* Weight Input with Unit Toggle */}
            <YStack gap="$2">
              <Text fontSize="$3" color="$colorHover">
                Weight
              </Text>
              <XStack gap="$3" alignItems="center">
                <Input
                  flex={1}
                  size="$4"
                  keyboardType="decimal-pad"
                  placeholder={`Enter weight in ${displayUnit}`}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  backgroundColor={isDark ? '#1F2937' : '#F9FAFB'}
                  borderColor={isDark ? '#374151' : '#E5E7EB'}
                  color="$color"
                />
                
                {/* Unit Toggle */}
                <XStack
                  backgroundColor={isDark ? '#1F2937' : '#F3F4F6'}
                  borderRadius="$3"
                  padding="$1"
                >
                  <Button
                    size="$3"
                    backgroundColor={displayUnit === 'lbs' ? '#10B981' : 'transparent'}
                    pressStyle={{ backgroundColor: displayUnit === 'lbs' ? '#10B981' : '$backgroundHover' }}
                    onPress={() => handleUnitToggle('lbs')}
                    borderRadius="$2"
                  >
                    <Text
                      color={displayUnit === 'lbs' ? 'white' : '$colorHover'}
                      fontWeight={displayUnit === 'lbs' ? '600' : '400'}
                    >
                      lbs
                    </Text>
                  </Button>
                  <Button
                    size="$3"
                    backgroundColor={displayUnit === 'kg' ? '#10B981' : 'transparent'}
                    pressStyle={{ backgroundColor: displayUnit === 'kg' ? '#10B981' : '$backgroundHover' }}
                    onPress={() => handleUnitToggle('kg')}
                    borderRadius="$2"
                  >
                    <Text
                      color={displayUnit === 'kg' ? 'white' : '$colorHover'}
                      fontWeight={displayUnit === 'kg' ? '600' : '400'}
                    >
                      kg
                    </Text>
                  </Button>
                </XStack>
              </XStack>
            </YStack>

            {/* Notes Input */}
            <YStack gap="$2">
              <Text fontSize="$3" color="$colorHover">
                Notes (optional)
              </Text>
              <TextArea
                size="$4"
                placeholder="Add any notes..."
                value={notesInput}
                onChangeText={setNotesInput}
                backgroundColor={isDark ? '#1F2937' : '#F9FAFB'}
                borderColor={isDark ? '#374151' : '#E5E7EB'}
                color="$color"
                numberOfLines={3}
              />
            </YStack>

            {/* Action Buttons */}
            <XStack gap="$3" marginTop="$2">
              {hasEntry && (
                <Button
                  flex={1}
                  size="$4"
                  backgroundColor="#EF4444"
                  pressStyle={{ backgroundColor: '#DC2626' }}
                  onPress={handleDelete}
                  icon={<Trash2 size={18} color="white" />}
                >
                  <Text color="white" fontWeight="600">Delete</Text>
                </Button>
              )}
              <Button
                flex={hasEntry ? 2 : 1}
                size="$4"
                backgroundColor={isValidWeight() ? '#10B981' : isDark ? '#374151' : '#E5E7EB'}
                pressStyle={{ backgroundColor: isValidWeight() ? '#059669' : undefined }}
                onPress={handleSave}
                disabled={!isValidWeight()}
              >
                <Text
                  color={isValidWeight() ? 'white' : '$colorHover'}
                  fontWeight="600"
                >
                  {hasEntry ? 'Update' : 'Save'}
                </Text>
              </Button>
            </XStack>
          </YStack>
        </Card>

        {/* Show existing entry details if viewing a past date */}
        {!viewingToday && hasEntry && existingEntry && (
          <Card
            bordered
            padding="$3"
            backgroundColor="$background"
          >
            <YStack gap="$2">
              <Text fontSize="$3" color="$colorHover">
                Logged at {new Date(existingEntry.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {existingEntry.updatedAt !== existingEntry.createdAt && (
                <Text fontSize="$2" color="$colorHover">
                  Updated at {new Date(existingEntry.updatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}
            </YStack>
          </Card>
        )}

        {/* Large weight display when entry exists */}
        {hasEntry && existingEntry && (
          <Card
            elevate
            bordered
            padding="$6"
            backgroundColor="$background"
            alignItems="center"
          >
            <Text fontSize="$10" fontWeight="700" color="$color">
              {existingEntry.unit === displayUnit
                ? existingEntry.weight
                : convertWeight(existingEntry.weight, existingEntry.unit, displayUnit)}
            </Text>
            <Text fontSize="$5" color="$colorHover" marginTop="$1">
              {displayUnit}
            </Text>
            {existingEntry.notes && (
              <>
                <Separator marginVertical="$3" />
                <Text fontSize="$3" color="$colorHover" textAlign="center">
                  {existingEntry.notes}
                </Text>
              </>
            )}
          </Card>
        )}

        {/* Empty state for past dates without entries */}
        {!viewingToday && !hasEntry && (
          <YStack alignItems="center" gap="$4" paddingVertical="$6">
            <Text fontSize="$5" color="$colorHover">
              No weight recorded
            </Text>
            <Text fontSize="$3" color="$colorHover" textAlign="center">
              You can still add a weight entry for this date using the form above.
            </Text>
          </YStack>
        )}
      </YStack>
    </SwipeableDateHeader>
  );
}
