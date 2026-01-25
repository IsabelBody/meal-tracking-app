import { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Card,
  H3,
  Input,
  Button,
  Separator,
  Label,
  Switch,
} from 'tamagui';
import { Target, Settings, Info } from '@tamagui/lucide-icons';

import { useGoalsStore } from '../../src/stores/goals.store';
import { DEFAULT_GOALS } from '../../src/types';

export default function ProfileScreen() {
  const { goals, profile, updateGoals, updateProfile, resetGoals } = useGoalsStore();

  // Local state for editing
  const [editedGoals, setEditedGoals] = useState({
    calories: String(goals.calories),
    protein: String(goals.protein),
    carbs: String(goals.carbs),
    fat: String(goals.fat),
    fiber: String(goals.fiber || 25),
  });

  const handleSaveGoals = () => {
    const newGoals = {
      calories: parseInt(editedGoals.calories, 10) || DEFAULT_GOALS.calories,
      protein: parseInt(editedGoals.protein, 10) || DEFAULT_GOALS.protein,
      carbs: parseInt(editedGoals.carbs, 10) || DEFAULT_GOALS.carbs,
      fat: parseInt(editedGoals.fat, 10) || DEFAULT_GOALS.fat,
      fiber: parseInt(editedGoals.fiber, 10) || DEFAULT_GOALS.fiber,
    };
    updateGoals(newGoals);
    Alert.alert('Success', 'Your goals have been updated.');
  };

  const handleResetGoals = () => {
    Alert.alert(
      'Reset Goals',
      'Are you sure you want to reset your goals to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetGoals();
            setEditedGoals({
              calories: String(DEFAULT_GOALS.calories),
              protein: String(DEFAULT_GOALS.protein),
              carbs: String(DEFAULT_GOALS.carbs),
              fat: String(DEFAULT_GOALS.fat),
              fiber: String(DEFAULT_GOALS.fiber),
            });
          },
        },
      ]
    );
  };

  const handleToggleUnits = () => {
    updateProfile({
      unitSystem: profile.unitSystem === 'metric' ? 'imperial' : 'metric',
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Goals Section */}
      <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
        <XStack alignItems="center" gap="$2" marginBottom="$4">
          <Target size={24} color="#10B981" />
          <H3 color="$color">Daily Goals</H3>
        </XStack>

        <YStack gap="$4">
          {/* Calories */}
          <YStack gap="$2">
            <Label htmlFor="calories" color="$color">
              Daily Calories
            </Label>
            <Input
              id="calories"
              value={editedGoals.calories}
              onChangeText={(text) =>
                setEditedGoals((prev) => ({ ...prev, calories: text }))
              }
              keyboardType="numeric"
              placeholder="2000"
            />
          </YStack>

          <Separator />

          {/* Macros */}
          <Text fontWeight="600" color="$color">Macronutrients (grams)</Text>
          
          <XStack gap="$3">
            <YStack flex={1} gap="$2">
              <Label htmlFor="protein" fontSize="$2" color="$colorHover">
                Protein
              </Label>
              <Input
                id="protein"
                value={editedGoals.protein}
                onChangeText={(text) =>
                  setEditedGoals((prev) => ({ ...prev, protein: text }))
                }
                keyboardType="numeric"
                placeholder="150"
                size="$3"
              />
            </YStack>

            <YStack flex={1} gap="$2">
              <Label htmlFor="carbs" fontSize="$2" color="$colorHover">
                Carbs
              </Label>
              <Input
                id="carbs"
                value={editedGoals.carbs}
                onChangeText={(text) =>
                  setEditedGoals((prev) => ({ ...prev, carbs: text }))
                }
                keyboardType="numeric"
                placeholder="250"
                size="$3"
              />
            </YStack>

            <YStack flex={1} gap="$2">
              <Label htmlFor="fat" fontSize="$2" color="$colorHover">
                Fat
              </Label>
              <Input
                id="fat"
                value={editedGoals.fat}
                onChangeText={(text) =>
                  setEditedGoals((prev) => ({ ...prev, fat: text }))
                }
                keyboardType="numeric"
                placeholder="65"
                size="$3"
              />
            </YStack>
          </XStack>

          {/* Fiber */}
          <YStack gap="$2">
            <Label htmlFor="fiber" fontSize="$2" color="$colorHover">
              Fiber (optional)
            </Label>
            <Input
              id="fiber"
              value={editedGoals.fiber}
              onChangeText={(text) =>
                setEditedGoals((prev) => ({ ...prev, fiber: text }))
              }
              keyboardType="numeric"
              placeholder="25"
              size="$3"
            />
          </YStack>

          <XStack gap="$3" marginTop="$2">
            <Button
              flex={1}
              backgroundColor="#10B981"
              color="white"
              onPress={handleSaveGoals}
            >
              Save Goals
            </Button>
            <Button
              backgroundColor="$background"
              borderWidth={1}
              borderColor="$borderColor"
              onPress={handleResetGoals}
            >
              Reset
            </Button>
          </XStack>
        </YStack>
      </Card>

      {/* Preferences Section */}
      <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
        <XStack alignItems="center" gap="$2" marginBottom="$4">
          <Settings size={24} color="#10B981" />
          <H3 color="$color">Preferences</H3>
        </XStack>

        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <Text fontWeight="500" color="$color">Unit System</Text>
            <Text fontSize="$2" color="$colorHover">
              Currently: {profile.unitSystem === 'metric' ? 'Metric (g, kg)' : 'Imperial (oz, lb)'}
            </Text>
          </YStack>
          <Switch
            checked={profile.unitSystem === 'imperial'}
            onCheckedChange={handleToggleUnits}
            backgroundColor={profile.unitSystem === 'imperial' ? '#10B981' : '$backgroundHover'}
          >
            <Switch.Thumb animation="bouncy" />
          </Switch>
        </XStack>
      </Card>

      {/* About Section */}
      <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
        <XStack alignItems="center" gap="$2" marginBottom="$4">
          <Info size={24} color="#10B981" />
          <H3 color="$color">About</H3>
        </XStack>

        <YStack gap="$2">
          <Text color="$color">Meal Tracker v1.0.0</Text>
          <Text fontSize="$2" color="$colorHover">
            Nutrition data powered by FatSecret and Open Food Facts
          </Text>
          <Separator marginVertical="$2" />
          <Text fontSize="$2" color="$colorHover">
            Track your meals, monitor macros, and achieve your nutrition goals.
          </Text>
        </YStack>
      </Card>

      {/* Attribution (required for FatSecret Basic tier) */}
      <Card padding="$3" backgroundColor="$backgroundHover" marginBottom="$4">
        <Text fontSize="$1" color="$colorHover" textAlign="center">
          Powered by FatSecret Platform API
        </Text>
      </Card>
    </ScrollView>
  );
}
